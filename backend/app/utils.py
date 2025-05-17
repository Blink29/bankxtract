import PyPDF2
import re
from datetime import datetime
import os

def extract_transactions_from_pdf(pdf_path):
    try:
        with open(pdf_path, 'rb') as file:
            reader = PyPDF2.PdfReader(file)
            text = ''
            for page in reader.pages:
                text += page.extract_text()
        
        # Store the raw text for debugging purposes
        debug_output_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'debug_output')
        os.makedirs(debug_output_dir, exist_ok=True)
        with open(os.path.join(debug_output_dir, 'extracted_text.txt'), 'w', encoding='utf-8') as f:
            f.write(text)
        
        # Try multiple parsing strategies and pick the one that gives the most complete results
        results = []
        
        # Try detection for specific banks first
        if "Wells Fargo" in text:
            results.append(parse_wells_fargo_statement(text))
        
        # Try tabular structure next (good for most structured PDFs)
        results.append(parse_tabular_statement(text))
        
        # Always try the generic statement parser as a backup
        results.append(parse_generic_statement(text))
        
        # Choose the best result based on completeness
        best_result = select_best_result(results)
        
        return best_result
    except Exception as e:
        # Log the error and return a structured error response
        error_message = f"Error extracting PDF data: {str(e)}"
        print(error_message)
        return {
            'error': error_message,
            'starting_balance': None,
            'ending_balance': None,
            'transactions': [],
            'validation': {
                'is_valid': False,
                'message': error_message
            }
        }

def parse_wells_fargo_statement(text):
    # Extract the starting and ending balance
    starting_balance_match = re.search(r"Beginning balance on \d+/\d+\s+\$([\d,]+\.\d{2})", text)
    ending_balance_match = re.search(r"Ending balance on \d+/\d+\s+\$([\d,]+\.\d{2})", text)
    
    starting_balance = None
    ending_balance = None
    
    if starting_balance_match:
        starting_balance = float(starting_balance_match.group(1).replace(',', ''))
    
    if ending_balance_match:
        ending_balance = float(ending_balance_match.group(1).replace(',', ''))
    
    # Extract transactions
    transactions = []
    
    # Look for transaction tables in the document
    # Wells Fargo typically lists deposits, withdrawals, and electronic transactions separately
    
    # Pattern for transactions in Wells Fargo statements
    # This pattern needs to be refined based on the exact format of the statements
    transaction_pattern = r'(\d{1,2}/\d{1,2})\s+([^\n]+?)\s+(\d+,?\d*\.\d{2})'
    debit_section = False
    credit_section = False
    
    for line in text.split('\n'):
        # Detect transaction sections
        if "Deposits and other credits" in line:
            debit_section = False
            credit_section = True
            continue
        elif "Withdrawals and other debits" in line:
            debit_section = True
            credit_section = False
            continue
        
        # Look for transaction lines
        match = re.search(transaction_pattern, line)
        if match:
            date_str = match.group(1)
            description = match.group(2).strip()
            amount_str = match.group(3).replace(',', '')
            amount = float(amount_str)
            
            # Determine direction based on the section or context
            direction = "Credit" if credit_section else "Debit"
            
            # Convert date (assuming current year if not specified)
            try:
                # Try MM/DD/YYYY format
                if len(date_str.split('/')) > 2:
                    date_obj = datetime.strptime(date_str, '%m/%d/%Y')
                else:
                    # Try MM/DD format and add the year from the statement
                    year_match = re.search(r'\d{4}', text[:200])  # Look for year in the header
                    year = datetime.now().year if not year_match else year_match.group(0)
                    date_obj = datetime.strptime(f"{date_str}/{year}", '%m/%d/%Y')
                
                formatted_date = date_obj.strftime('%Y-%m-%d')
            except ValueError:
                formatted_date = date_str  # Fallback to original format
            
            transaction = {
                'date': formatted_date,
                'description': description,
                'direction': direction,
                'amount': amount
            }
            
            transactions.append(transaction)
    
    # Validate the calculations
    validation_result = validate_transactions(starting_balance, ending_balance, transactions)
    
    return {
        'starting_balance': starting_balance,
        'ending_balance': ending_balance,
        'transactions': transactions,
        'validation': validation_result
    }

def parse_generic_statement(text):
    # Extract the starting and ending balance
    starting_balance = extract_starting_balance(text)
    ending_balance = extract_ending_balance(text)
    
    # Extract transactions
    transactions = extract_transactions(text)
    
    # Validate the calculations
    validation_result = validate_transactions(starting_balance, ending_balance, transactions)
    
    return {
        'starting_balance': starting_balance,
        'ending_balance': ending_balance,
        'transactions': transactions,
        'validation': validation_result
    }

def parse_tabular_statement(text):
    """Parse a bank statement that has a clear tabular structure."""
    
    # Extract the starting and ending balance
    starting_balance = extract_starting_balance(text)
    ending_balance = extract_ending_balance(text)
    
    # Try to identify transaction tables in the text
    transactions = []
    
    # Look for common table headers in bank statements
    table_header_patterns = [
        r'(Date|Transaction Date)\s+(Description|Particulars|Details|Narrative)\s+(Debit|Credit|Amount|Withdrawal|Deposit)',
        r'(Date)\s+(Transaction)\s+(Amount)\s+(Balance)',
        r'(Date)\s+(Reference)\s+(Amount)\s+(Type)'
    ]
    
    table_sections = []
    for pattern in table_header_patterns:
        header_matches = list(re.finditer(pattern, text, re.IGNORECASE))
        for match in header_matches:
            # The table likely starts after the header
            start_pos = match.end()
            
            # Look for the end of the table (often marked by a "balance" line or summary)
            end_match = re.search(r'(Balance brought forward|Closing Balance|Total|Summary)', text[start_pos:], re.IGNORECASE)
            end_pos = start_pos + end_match.start() if end_match else len(text)
            
            table_sections.append(text[start_pos:end_pos])
    
    # Process each identified table section
    for table_text in table_sections:
        # Split into lines
        lines = table_text.strip().split('\n')
        
        # Process each line as a potential transaction
        for line in lines:
            # Skip empty lines or headers
            if not line.strip() or re.search(r'(Date|Description|Amount|Balance|Reference)', line, re.IGNORECASE):
                continue
            
            # Try to extract transaction data using regex
            # Date pattern that covers multiple date formats
            date_pattern = r'(\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?)'
            
            # Look for a line with a date at the beginning
            if re.match(date_pattern, line.strip()):
                # Extract components
                date_match = re.match(date_pattern, line.strip())
                date_str = date_match.group(1)
                
                # Extract amount - look for numeric value with decimal point
                amount_match = re.search(r'(?:[$£€])?([\d,]+\.\d{2})', line)
                if amount_match:
                    amount_str = amount_match.group(1).replace(',', '')
                    amount = float(amount_str)
                    
                    # Determine description - everything between date and amount
                    full_line = line.strip()
                    date_end = date_match.end()
                    amount_start = full_line.find(amount_match.group(0))
                    
                    if amount_start > date_end:
                        description = full_line[date_end:amount_start].strip()
                    else:
                        description = "Transaction on " + date_str
                    
                    # Determine direction
                    direction = determine_transaction_direction(line)
                    
                    # Parse the date
                    try:
                        # Try various date formats based on what we matched
                        if '/' in date_str:
                            parts = date_str.split('/')
                        else:
                            parts = date_str.split('-')
                        
                        # Handle different date formats
                        if len(parts) == 3:
                            if len(parts[2]) == 2:  # YY format
                                year = 2000 + int(parts[2]) if int(parts[2]) < 50 else 1900 + int(parts[2])
                            else:
                                year = int(parts[2])
                                
                            if len(parts[0]) > 2:  # YYYY-MM-DD
                                date_obj = datetime(year=int(parts[0]), month=int(parts[1]), day=int(parts[2]))
                            else:  # DD/MM/YYYY or MM/DD/YYYY
                                # Assume DD/MM/YYYY format (common outside US)
                                date_obj = datetime(year=year, month=int(parts[1]), day=int(parts[0]))
                        else:  # Assume MM/DD format with current year
                            date_obj = datetime(year=datetime.now().year, month=int(parts[0]), day=int(parts[1]))
                            
                        formatted_date = date_obj.strftime('%Y-%m-%d')
                    except:
                        formatted_date = date_str
                    
                    transaction = {
                        'date': formatted_date,
                        'description': description,
                        'direction': direction,
                        'amount': amount
                    }
                    
                    transactions.append(transaction)
    
    # Validate the calculations
    validation_result = validate_transactions(starting_balance, ending_balance, transactions)
    
    return {
        'starting_balance': starting_balance,
        'ending_balance': ending_balance,
        'transactions': transactions,
        'validation': validation_result
    }

def extract_starting_balance(text):
    # Regular expression for finding starting balance
    # Multiple patterns to handle different bank statement formats
    patterns = [
        # Common formats with "Balance" keyword
        r"(?:Opening|Starting|Beginning)(?:\s+)Balance[:\s]+[$£€]?([\d,]+\.\d{2})",
        r"Balance (?:brought )?forward[:\s]+[$£€]?([\d,]+\.\d{2})",
        r"Previous Balance[:\s]+[$£€]?([\d,]+\.\d{2})",
        
        # Date-based formats
        r"Balance (?:as )?(?:of|on) (?:\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?)(?:[^\d]+)?[$£€]?([\d,]+\.\d{2})",
        
        # Statement period formats
        r"(?:Statement|Billing) Period Begins[:\s]+\d{1,2}[/-]\d{1,2}[/-]\d{2,4}[^\d]+?[$£€]?([\d,]+\.\d{2})",
        r"(?:Start(?:ing)?|Begin(?:ning)?) Date[:\s]+\d{1,2}[/-]\d{1,2}[/-]\d{2,4}[^\d]+?[$£€]?([\d,]+\.\d{2})",
        
        # Generic "previous" or "old" balance
        r"(?:Previous|Old|Last) (?:Statement )?Balance[:\s]+[$£€]?([\d,]+\.\d{2})",
        
        # First row in a balance table that mentions "opening" or "beginning"
        r"(?:Opening|Beginning|Previous|Start)(?:[^\n\r]+)?[$£€]?([\d,]+\.\d{2})"
    ]
    
    # Try all patterns
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            try:
                balance_str = match.group(1).replace(',', '')
                return float(balance_str)
            except (ValueError, IndexError):
                # Continue with the next pattern if conversion fails
                continue
    
    # If no patterns worked, try looking for the first balance in the statement
    # (Often the first amount with currency symbol on the page)
    first_balance_match = re.search(r'[$£€]([\d,]+\.\d{2})', text[:1000])
    if first_balance_match:
        try:
            return float(first_balance_match.group(1).replace(',', ''))
        except (ValueError, IndexError):
            pass
    
    return None

def extract_ending_balance(text):
    # Regular expression for finding ending balance
    # Multiple patterns to handle different bank statement formats
    patterns = [
        # Common formats with "Balance" keyword
        r"(?:Closing|Ending|Final)(?:\s+)Balance[:\s]+[$£€]?([\d,]+\.\d{2})",
        r"(?:Current|New) Balance[:\s]+[$£€]?([\d,]+\.\d{2})",
        
        # Date-based formats
        r"Balance (?:as )?(?:of|on) \d{1,2}[/-]\d{1,2}[/-]\d{2,4}[:\s]+[$£€]?([\d,]+\.\d{2})",
        r"Ending balance on \d{1,2}[/-]\d{1,2}[:\s]+[$£€]?([\d,]+\.\d{2})",
        
        # Statement period formats
        r"(?:Statement|Billing) Period Ends[:\s]+\d{1,2}[/-]\d{1,2}[/-]\d{2,4}[^\d]+?[$£€]?([\d,]+\.\d{2})",
        r"End(?:ing)? Date[:\s]+\d{1,2}[/-]\d{1,2}[/-]\d{2,4}[^\d]+?[$£€]?([\d,]+\.\d{2})",
        
        # Last row in a balance table that mentions "closing" or "ending"
        r"(?:Closing|Ending|Final|New)(?:[^\n\r]+)?[$£€]?([\d,]+\.\d{2})"
    ]
    
    # Try all patterns
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            try:
                balance_str = match.group(1).replace(',', '')
                return float(balance_str)
            except (ValueError, IndexError):
                # Continue with the next pattern if conversion fails
                continue
    
    # If no patterns worked, try looking for the last balance in the statement
    # (Often the last amount with currency symbol on the page)
    last_balance_matches = list(re.finditer(r'[$£€]([\d,]+\.\d{2})', text[-1000:]))
    if last_balance_matches:
        try:
            # Get the last match
            return float(last_balance_matches[-1].group(1).replace(',', ''))
        except (ValueError, IndexError):
            pass
    
    return None

def extract_transactions(text):
    transactions = []
    
    # Multiple patterns to handle different transaction formats
    patterns = [
        # Date format DD/MM/YYYY with explicit debit/credit
        r'(\d{2}/\d{2}/\d{4})\s+([A-Za-z0-9\s.,&\-]+?)\s+(Credit|Debit)\s+[$£€]?([\d,]+\.\d{2})',
        
        # Date format MM/DD with amount and description
        r'(\d{1,2}/\d{1,2})\s+([A-Za-z0-9\s.,&\-]+?)\s+(\d+,?\d*\.\d{2})',
        
        # Transaction with codes and date formats like MM/DD or MM/DD/YYYY
        r'(\d{1,2}/\d{1,2}(?:/\d{2,4})?)\s+([A-Za-z0-9\s.,&\-]+?)\s+([A-Z]{2,5})?\s+[$£€]?([\d,]+\.\d{2})',
        
        # Format with date at beginning, then description and amount at the end
        r'(\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?)\s+([^$£€\d]+)\s+[$£€]?([\d,]+\.\d{2})',
        
        # Additional format for statements with tabular data
        r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\s+(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})?\s+([A-Za-z0-9\s.,&\-]+?)\s+[$£€]?([\d,]+\.\d{2})\s*[DR]?'
    ]
      # Try to identify sections for credits and debits
    credit_section = False
    debit_section = False
    
    # Look for section headers that might indicate transaction type
    if re.search(r"(Deposits|Credits|Money In|Incoming|Income)", text, re.IGNORECASE):
        credit_indicators_exist = True
    else:
        credit_indicators_exist = False
        
    if re.search(r"(Withdrawals|Debits|Money Out|Outgoing|Expenses)", text, re.IGNORECASE):
        debit_indicators_exist = True
    else:
        debit_indicators_exist = False
    
    # For each pattern, try to extract transactions
    for pattern in patterns:
        matches = re.finditer(pattern, text, re.MULTILINE)
        
        for match in matches:
            groups = match.groups()
            if len(groups) < 2:  # Need at least date and amount
                continue
                
            date_str = groups[0]
            
            # Handle different pattern formats
            if len(groups) >= 4:
                # Format might be: Date, Description, Direction/Code, Amount
                # or: Date, PostDate, Description, Amount
                if groups[1] and re.match(r'\d{1,2}[/-]\d{1,2}', groups[1]):
                    # Second group is a date, so it's probably a post date
                    description = groups[2].strip() if groups[2] else "Unknown"
                    amount_str = groups[3].replace(',', '')
                    direction = determine_transaction_direction(match.group(0), credit_section, debit_section)
                else:
                    description = groups[1].strip() if groups[1] else "Unknown"
                    direction_indicator = groups[2] if groups[2] else ""
                    
                    # Check if third group might be a transaction code or direction
                    if direction_indicator in ["Credit", "Debit", "CR", "DR"]:
                        direction = "Credit" if direction_indicator in ["Credit", "CR"] else "Debit"
                    else:
                        direction = determine_transaction_direction(match.group(0), credit_section, debit_section)
                        
                    amount_str = groups[3].replace(',', '')
            elif len(groups) == 3:
                # Format: Date, Description, Amount
                description = groups[1].strip() if groups[1] else "Unknown"
                amount_str = groups[2].replace(',', '')
                direction = determine_transaction_direction(match.group(0), credit_section, debit_section)
            elif len(groups) == 2:
                # Format: Date, Amount (minimal info)
                description = "Transaction on " + date_str
                amount_str = groups[1].replace(',', '')
                direction = determine_transaction_direction(match.group(0), credit_section, debit_section)
            else:
                continue  # Skip if pattern doesn't match properly
            
            # Clean up the amount string and convert to float
            amount_str = re.sub(r'[^\d.,]', '', amount_str)
            
            try:
                amount = float(amount_str)
            except ValueError:
                continue  # Skip if amount can't be converted to float
            
            # Parse the date
            try:
                # Try various date formats
                if re.match(r'\d{2}/\d{2}/\d{4}', date_str):
                    date_obj = datetime.strptime(date_str, '%d/%m/%Y')
                elif re.match(r'\d{1,2}/\d{1,2}/\d{4}', date_str):
                    date_obj = datetime.strptime(date_str, '%m/%d/%Y')
                elif re.match(r'\d{1,2}/\d{1,2}', date_str):
                    # Add current year if year not provided
                    year_match = re.search(r'\d{4}', text[:200])  # Look for year in header
                    year = datetime.now().year if not year_match else int(year_match.group(0))
                    date_obj = datetime.strptime(f"{date_str}/{year}", '%m/%d/%Y')
                else:
                    continue  # Skip if date format is unknown
                
                formatted_date = date_obj.strftime('%Y-%m-%d')
            except ValueError:
                formatted_date = date_str  # Fallback to original format
            
            transaction = {
                'date': formatted_date,
                'description': description,
                'direction': direction,
                'amount': amount
            }
            
            transactions.append(transaction)
    
    return transactions

def validate_transactions(starting_balance, ending_balance, transactions):
    """
    Validates that transactions add up correctly from starting to ending balance.
    Also checks for common issues in the extracted data.
    """
    result = {
        'is_valid': False,
        'warnings': [],
        'calculated_ending_balance': None,
        'expected_ending_balance': ending_balance
    }
    
    # Check for missing balances
    if starting_balance is None:
        result['warnings'].append('Could not extract starting balance')
    
    if ending_balance is None:
        result['warnings'].append('Could not extract ending balance')
        
    # Check for empty transactions list
    if not transactions:
        result['warnings'].append('No transactions were extracted')
    
    # Check for transactions without required fields
    invalid_transactions = [
        i for i, t in enumerate(transactions) 
        if ('amount' not in t or 'direction' not in t)
    ]
    
    if invalid_transactions:
        result['warnings'].append(f'Found {len(invalid_transactions)} transactions with missing required fields')
    
    # If we don't have both balances, we can't do the calculation
    if starting_balance is None or ending_balance is None:
        result['message'] = 'Cannot validate: Missing balance information'
        return result
    
    # Calculate the ending balance based on transactions
    calculated_ending_balance = starting_balance
    for transaction in transactions:
        if 'direction' not in transaction or 'amount' not in transaction:
            continue
            
        if transaction['direction'].lower() == 'credit':
            calculated_ending_balance += transaction['amount']
        elif transaction['direction'].lower() == 'debit':
            calculated_ending_balance -= transaction['amount']
    
    # Round to 2 decimal places to avoid floating point issues
    calculated_ending_balance = round(calculated_ending_balance, 2)
    ending_balance = round(ending_balance, 2)
    
    # Check if the calculation matches the expected ending balance
    difference = calculated_ending_balance - ending_balance
    is_valid = abs(difference) < 0.01
    
    result.update({
        'is_valid': is_valid,
        'calculated_ending_balance': calculated_ending_balance,
        'expected_ending_balance': ending_balance,
        'difference': difference,
        'message': 'Balance calculation is valid' if is_valid else f'Discrepancy of {difference} detected in balance calculation'
    })
    
    return result

def select_best_result(results):
    """Select the most complete parsing result from multiple attempts."""
    if not results:
        return {
            'starting_balance': None,
            'ending_balance': None,
            'transactions': [],
            'validation': {
                'is_valid': False,
                'message': 'No parsing results available'
            }
        }
    
    # Score each result based on completeness
    scored_results = []
    for result in results:
        score = 0
        
        # Check if it has balance information
        if result.get('starting_balance') is not None:
            score += 10
        if result.get('ending_balance') is not None:
            score += 10
            
        # Check transaction count
        transactions = result.get('transactions', [])
        score += len(transactions) * 2
        
        # Check validation
        validation = result.get('validation', {})
        if validation.get('is_valid', False):
            score += 20
            
        scored_results.append((score, result))
    
    # Return the highest scoring result
    scored_results.sort(key=lambda x: x[0], reverse=True)
    return scored_results[0][1]

def determine_transaction_direction(transaction_text, credit_section=False, debit_section=False):
    """
    Determine if a transaction is a credit or debit based on context and keywords.
    
    Args:
        transaction_text (str): The full text of the transaction line
        credit_section (bool): Whether we're in a section identified as credits
        debit_section (bool): Whether we're in a section identified as debits
        
    Returns:
        str: "Credit" or "Debit"
    """
    # If we're in an identified section, use that
    if credit_section:
        return "Credit"
    if debit_section:
        return "Debit"
    
    # Look for Credit/Debit indicators in the text
    credit_indicators = ['credit', 'deposit', 'interest', 'refund', 'transfer in', 'salary', 'income']
    debit_indicators = ['debit', 'withdrawal', 'payment', 'purchase', 'fee', 'charge', 'transfer out']
    
    lower_text = transaction_text.lower()
    
    # Check for explicit CR/DR indicators
    if re.search(r'\bCR\b', transaction_text) or re.search(r'\+\s*\d', transaction_text):
        return "Credit"
    if re.search(r'\bDR\b', transaction_text) or re.search(r'\-\s*\d', transaction_text):
        return "Debit"
    
    # Check for keywords
    for indicator in credit_indicators:
        if indicator in lower_text:
            return "Credit"
            
    for indicator in debit_indicators:
        if indicator in lower_text:
            return "Debit"
    
    # Default to Debit as most transactions are expenses
    return "Debit"

"""
Bank Statement Parser
This module provides a unified parser for bank statement PDFs.
"""
import os
import re
from datetime import datetime
import PyPDF2


class BankStatementParser:
    """
    A class to parse bank statement PDFs and extract transaction data.
    The parser is designed to handle various bank statement formats.
    """
    
    def __init__(self):
        """Initialize the parser with common patterns for various bank statements."""
        # Patterns for finding starting balances
        self.starting_balance_patterns = [
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
            r"(?:Opening|Beginning|Previous|Start)(?:[^\n\r]+)?[$£€]?([\d,]+\.\d{2})",
            
            # Bank-specific patterns
            r"Beginning balance on \d+/\d+\s+\$([\d,]+\.\d{2})"
        ]
        
        # Patterns for finding ending balances
        self.ending_balance_patterns = [
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
        
        # Transaction patterns for different formats
        self.transaction_patterns = [
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
        
        # Table header patterns for structured PDFs
        self.table_header_patterns = [
            r'(Date|Transaction Date)\s+(Description|Particulars|Details|Narrative)\s+(Debit|Credit|Amount|Withdrawal|Deposit)',
            r'(Date)\s+(Transaction)\s+(Amount)\s+(Balance)',
            r'(Date)\s+(Reference)\s+(Amount)\s+(Type)'
        ]
        
        # Keywords for determining transaction direction
        self.credit_indicators = [
            'credit', 'deposit', 'interest', 'refund', 'transfer in', 
            'salary', 'income', 'payment received'
        ]
        self.debit_indicators = [
            'debit', 'withdrawal', 'payment', 'purchase', 'fee', 
            'charge', 'transfer out', 'check'
        ]
    
    def parse_pdf(self, pdf_path):
        """
        Main method to parse a bank statement PDF and extract relevant information.
        
        Args:
            pdf_path (str): Path to the PDF file
            
        Returns:
            dict: Dictionary with extracted data including:
                - starting_balance: The opening balance
                - ending_balance: The closing balance
                - transactions: List of transaction dictionaries
                - validation: Validation results
        """
        try:
            # Extract text from PDF
            text = self._extract_text_from_pdf(pdf_path)
            
            # Save extracted text for debugging
            self._save_debug_text(pdf_path, text)
            
            # Extract balances
            starting_balance = self._extract_starting_balance(text)
            ending_balance = self._extract_ending_balance(text)
            
            # Extract transactions using multiple strategies
            transactions = []
            
            # Strategy 1: Try to find table structures first (most reliable)
            table_transactions = self._extract_table_transactions(text)
            if table_transactions:
                transactions.extend(table_transactions)
                
            # Strategy 2: Look for individual transaction patterns
            pattern_transactions = self._extract_pattern_transactions(text)
            if pattern_transactions:
                # Avoid duplicates by removing transactions with the same date and amount
                existing_signatures = {
                    f"{t['date']}_{t['amount']}_{t.get('description', '')[:10]}" 
                    for t in transactions
                }
                
                for transaction in pattern_transactions:
                    signature = f"{transaction['date']}_{transaction['amount']}_{transaction.get('description', '')[:10]}"
                    if signature not in existing_signatures:
                        transactions.append(transaction)
                        existing_signatures.add(signature)
            
            # Validate the calculations
            validation_result = self._validate_transactions(starting_balance, ending_balance, transactions)
            
            return {
                'starting_balance': starting_balance,
                'ending_balance': ending_balance,
                'transactions': transactions,
                'validation': validation_result
            }
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
    
    def _extract_text_from_pdf(self, pdf_path):
        """Extract all text from a PDF file."""
        with open(pdf_path, 'rb') as file:
            reader = PyPDF2.PdfReader(file)
            text = ''
            for page in reader.pages:
                text += page.extract_text()
        return text
    
    def _save_debug_text(self, pdf_path, text):
        """Save extracted text for debugging purposes."""
        try:
            filename = os.path.basename(pdf_path)
            debug_output_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'debug_output')
            os.makedirs(debug_output_dir, exist_ok=True)
            with open(os.path.join(debug_output_dir, f"{filename}_extracted_text.txt"), 'w', encoding='utf-8') as f:
                f.write(text)
        except Exception as e:
            print(f"Warning: Could not save debug text: {str(e)}")
    
    def _extract_starting_balance(self, text):
        """Extract the starting balance from the statement text."""
        # Try all patterns
        for pattern in self.starting_balance_patterns:
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
    
    def _extract_ending_balance(self, text):
        """Extract the ending balance from the statement text."""
        # Try all patterns
        for pattern in self.ending_balance_patterns:
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
    
    def _extract_table_transactions(self, text):
        """Extract transactions from tables in the statement."""
        transactions = []
        
        # Try to identify transaction tables in the text
        table_sections = []
        for pattern in self.table_header_patterns:
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
                        direction = self._determine_transaction_direction(line)
                        
                        # Parse the date
                        formatted_date = self._parse_date(date_str, text)
                        
                        transaction = {
                            'date': formatted_date,
                            'description': description,
                            'direction': direction,
                            'amount': amount
                        }
                        
                        transactions.append(transaction)
        
        return transactions
    
    def _extract_pattern_transactions(self, text):
        """Extract transactions using regex patterns."""
        transactions = []
        
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
        
        # Process sections line by line to track if we're in a credit or debit section
        for line in text.split('\n'):
            # Check if line indicates a new section
            if re.search(r"(Deposits|Credits|Money In|Incoming|Income)", line, re.IGNORECASE):
                credit_section = True
                debit_section = False
                continue
            elif re.search(r"(Withdrawals|Debits|Money Out|Outgoing|Expenses)", line, re.IGNORECASE):
                debit_section = True
                credit_section = False
                continue
            
            # Now try all transaction patterns on this line
            for pattern in self.transaction_patterns:
                match = re.search(pattern, line)
                if match:
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
                            direction = self._determine_transaction_direction(match.group(0), credit_section, debit_section)
                        else:
                            description = groups[1].strip() if groups[1] else "Unknown"
                            direction_indicator = groups[2] if groups[2] else ""
                            
                            # Check if third group might be a transaction code or direction
                            if direction_indicator in ["Credit", "Debit", "CR", "DR"]:
                                direction = "Credit" if direction_indicator in ["Credit", "CR"] else "Debit"
                            else:
                                direction = self._determine_transaction_direction(match.group(0), credit_section, debit_section)
                                
                            amount_str = groups[3].replace(',', '')
                    elif len(groups) == 3:
                        # Format: Date, Description, Amount
                        description = groups[1].strip() if groups[1] else "Unknown"
                        amount_str = groups[2].replace(',', '')
                        direction = self._determine_transaction_direction(match.group(0), credit_section, debit_section)
                    elif len(groups) == 2:
                        # Format: Date, Amount (minimal info)
                        description = "Transaction on " + date_str
                        amount_str = groups[1].replace(',', '')
                        direction = self._determine_transaction_direction(match.group(0), credit_section, debit_section)
                    else:
                        continue  # Skip if pattern doesn't match properly
                    
                    # Clean up the amount string and convert to float
                    amount_str = re.sub(r'[^\d.,]', '', amount_str)
                    
                    try:
                        amount = float(amount_str)
                    except ValueError:
                        continue  # Skip if amount can't be converted to float
                    
                    # Parse the date
                    formatted_date = self._parse_date(date_str, text)
                    
                    transaction = {
                        'date': formatted_date,
                        'description': description,
                        'direction': direction,
                        'amount': amount
                    }
                    
                    transactions.append(transaction)
        
        return transactions
    
    def _parse_date(self, date_str, context_text=""):
        """
        Parse a date string into a standardized format.
        
        Args:
            date_str: The date string to parse
            context_text: The surrounding text for context (e.g., to find year)
            
        Returns:
            str: The date in YYYY-MM-DD format
        """
        try:
            # Try various date formats
            if re.match(r'\d{2}/\d{2}/\d{4}', date_str):
                date_obj = datetime.strptime(date_str, '%d/%m/%Y')
            elif re.match(r'\d{1,2}/\d{1,2}/\d{4}', date_str):
                date_obj = datetime.strptime(date_str, '%m/%d/%Y')
            elif re.match(r'\d{1,2}/\d{1,2}', date_str):
                # Add current year if year not provided
                year_match = re.search(r'\d{4}', context_text[:200])  # Look for year in header
                year = datetime.now().year if not year_match else int(year_match.group(0))
                date_obj = datetime.strptime(f"{date_str}/{year}", '%m/%d/%Y')
            elif re.match(r'\d{1,2}-\d{1,2}-\d{4}', date_str):
                date_obj = datetime.strptime(date_str, '%d-%m-%Y')
            elif re.match(r'\d{4}-\d{1,2}-\d{1,2}', date_str):
                date_obj = datetime.strptime(date_str, '%Y-%m-%d')
            else:
                return date_str  # Return original if format is unknown
            
            return date_obj.strftime('%Y-%m-%d')
        except ValueError:
            return date_str  # Fallback to original format
    
    def _determine_transaction_direction(self, transaction_text, credit_section=False, debit_section=False):
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
        
        lower_text = transaction_text.lower()
        
        # Special handling for specific transaction descriptions that are definitely credits
        if 'deposit made in a branch/store' in lower_text:
            return "Credit"
        
        # Check for specific deposit terms that are explicitly credits
        if any(term in lower_text for term in ['deposit', 'bankcard', 'mtot dep']):
            return "Credit"
            
        # Check for explicit CR/DR indicators
        if re.search(r'\bCR\b', transaction_text) or re.search(r'\+\s*\d', transaction_text):
            return "Credit"
        if re.search(r'\bDR\b', transaction_text) or re.search(r'\-\s*\d', transaction_text):
            return "Debit"
        
        # Check for keywords
        for indicator in self.credit_indicators:
            if indicator in lower_text:
                return "Credit"
                
        for indicator in self.debit_indicators:
            if indicator in lower_text:
                return "Debit"
        
        # Default depends on context clues
        if re.search(r'(purchase|payment|withdrawal|fee|charge)', lower_text, re.IGNORECASE):
            return "Debit"
        
        # Default to Debit as most transactions are expenses
        return "Debit"
    
    def _validate_transactions(self, starting_balance, ending_balance, transactions):
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

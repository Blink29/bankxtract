"""
AI Bank Statement Parser
This module provides AI-based parsing capabilities for bank statements using Google's Gemini API.
"""
import os
import json
import pathlib
from google import genai
from google.genai import types


class     AIBankStatementParser:
    """
    A class that uses Google's Gemini API to parse bank statements
    and extract transaction data from a variety of formats.
    """
    
    def __init__(self, api_key=None):
        """
        Initialize the AI parser.
        
        Args:
            api_key (str, optional): API key for the Gemini API. If not provided,
                                     it will look for GOOGLE_API_KEY environment variable.
        """
        self.api_key = api_key or os.environ.get("GOOGLE_API_KEY")
        # Configure the Gemini API client if API key is provided
        if self.api_key:
            self.client = genai.Client(api_key=self.api_key)
        else:
            self.client = None
            
    def parse_pdf(self, pdf_path):
        """
        Parse a PDF using only the Gemini AI method.
        
        Args:
            pdf_path (str): Path to the PDF file
            
        Returns:
            dict: Dictionary with extracted data
        """
        try:
            # Only use AI parsing
            ai_result = self._parse_with_ai(pdf_path)
            ai_result['parsing_method'] = 'ai'
            return ai_result
        except Exception as e:
            # Return error information if AI parsing fails
            error_message = f"AI parsing failed: {str(e)}"
            print(error_message)
            return {
                'error': error_message,
                'starting_balance': None,
                'ending_balance': None,
                'transactions': [],
                'parsing_method': 'ai_failed',
                'validation': {
                    'is_valid': False,
                    'warnings': [error_message],
                    'message': error_message
                }
            }
    
    def _parse_with_ai(self, pdf_path):
        """
        Use Google's Gemini AI to parse the PDF.
        
        Args:
            pdf_path (str): Path to the PDF file
            
        Returns:
            dict: Dictionary with extracted data
        """
        if not self.client:
            raise ValueError("API key not provided. Set GOOGLE_API_KEY environment variable or pass api_key to constructor.")
        try:
            # Create file path object
            filepath = pathlib.Path(pdf_path)
            pdf_bytes = filepath.read_bytes()
            
            # Create the prompt for Gemini
            prompt = """
            You are a specialized financial document processor. Extract the following information from the bank statement:
            1) Starting balance with currency
            2) Ending balance with currency
            3) All transactions with date, description, amount, and direction (credit/debit)
            
            Format your response as JSON with the following structure:
            {
                "starting_balance": "amount with currency",
                "ending_balance": "amount with currency",
                "transactions": [
                    {
                        "date": "YYYY-MM-DD",
                        "description": "transaction description",
                        "amount": "dollar amount",
                        "direction": "Credit or Debit"
                    }
                ]
            }
            
            Return ONLY valid JSON in your response, no other text.
            """
            
            # Generate content using the Gemini API with PDF content
            response = self.client.models.generate_content(
                model="gemini-2.0-flash",
                contents=[
                    types.Part.from_bytes(
                        data=pdf_bytes,
                        mime_type='application/pdf',
                    ),
                    prompt
                ]
            )
            
            # Get the response as text
            ai_response = response.text
            
            # Find JSON in the response (it might be wrapped in markdown code blocks)
            json_start = ai_response.find('{')
            json_end = ai_response.rfind('}') + 1
            
            if json_start == -1 or json_end == 0:
                raise ValueError("Could not find valid JSON in AI response")
            
            json_str = ai_response[json_start:json_end]
            
            # Parse the JSON
            extracted_data = json.loads(json_str)
            
        except Exception as e:
            raise Exception(f"Gemini API processing failed: {str(e)}")
        
        # Convert to our standard format
        result = self._standardize_ai_response(extracted_data)
        
        # Validate the calculations
        result['validation'] = self._validate_transactions(
            result['starting_balance'],
            result['ending_balance'],
            result['transactions']
        )
        
        return result
    
    def _standardize_ai_response(self, ai_data):
        """
        Convert the AI response to our standard format.
        
        Args:
            ai_data (dict): The data extracted by AI
            
        Returns:
            dict: Standardized data
        """
        # Initialize the result with default values
        result = {
            'starting_balance': None,
            'ending_balance': None,
            'transactions': []
        }
        
        # Extract starting and ending balances
        # The AI might return these in various formats, so we need to handle different cases
        if isinstance(ai_data, dict):
            # Extract starting balance
            starting_balance = ai_data.get('starting_balance')
            if starting_balance is not None:
                # If it's a string with a currency symbol, convert to float
                if isinstance(starting_balance, str):
                    # Remove currency symbols and commas
                    starting_balance = starting_balance.replace('$', '').replace('£', '').replace('€', '').replace(',', '')
                    try:
                        result['starting_balance'] = float(starting_balance)
                    except ValueError:
                        pass
                elif isinstance(starting_balance, (int, float)):
                    result['starting_balance'] = float(starting_balance)
                    
            # Extract ending balance
            ending_balance = ai_data.get('ending_balance')
            if ending_balance is not None:
                # If it's a string with a currency symbol, convert to float
                if isinstance(ending_balance, str):
                    # Remove currency symbols and commas
                    ending_balance = ending_balance.replace('$', '').replace('£', '').replace('€', '').replace(',', '')
                    try:
                        result['ending_balance'] = float(ending_balance)
                    except ValueError:
                        pass
                elif isinstance(ending_balance, (int, float)):
                    result['ending_balance'] = float(ending_balance)
            
            # Extract transactions
            transactions = ai_data.get('transactions', [])
            if isinstance(transactions, list):
                for transaction in transactions:
                    if not isinstance(transaction, dict):
                        continue
                        
                    # Extract transaction details
                    date = transaction.get('date')
                    description = transaction.get('description', '')
                    amount = transaction.get('amount')
                    
                    # Determine direction
                    direction = transaction.get('direction', '').lower()
                    if 'credit' in direction or 'deposit' in direction:
                        direction = 'Credit'
                    elif 'debit' in direction or 'withdrawal' in direction:
                        direction = 'Debit'
                    else:
                        # Try to infer from other fields
                        type_field = transaction.get('type', '').lower()
                        if 'credit' in type_field or 'deposit' in type_field:
                            direction = 'Credit'
                        elif 'debit' in type_field or 'withdrawal' in type_field:
                            direction = 'Debit'
                        else:
                            # Default to Debit if we can't determine
                            direction = 'Debit'
                    
                    # Convert amount to float if it's a string
                    if isinstance(amount, str):
                        # Remove currency symbols and commas
                        amount = amount.replace('$', '').replace('£', '').replace('€', '').replace(',', '')
                        try:
                            amount = float(amount)
                        except ValueError:
                            # Skip this transaction if amount can't be converted
                            continue
                    
                    if amount is None or not isinstance(amount, (int, float)):
                        # Skip this transaction if amount is missing or invalid
                        continue
                        
                    # Add the transaction to the result
                    result['transactions'].append({
                        'date': date,
                        'description': description,
                        'direction': direction,
                        'amount': float(amount)
                    })
        
        return result
    
    def _validate_transactions(self, starting_balance, ending_balance, transactions):
        """
        Validates that transactions add up correctly from starting to ending balance.
        This is the same validation logic as in the traditional parser.
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

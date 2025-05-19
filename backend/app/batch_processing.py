"""
Batch Processing Module for Bank Statement PDFs
This module provides functionality for processing multiple PDF bank statements.
"""
import os
import json
import uuid
from concurrent.futures import ThreadPoolExecutor
from .parser import BankStatementParser
from .ai_parser import AIBankStatementParser

class BatchProcessor:
    """
    Class for processing multiple bank statements and performing variance analysis.
    """
    
    def __init__(self):
        """Initialize the batch processor."""
        self.traditional_parser = BankStatementParser()
        self.ai_parser = AIBankStatementParser()
        
        # Create directory for batch results if it doesn't exist
        self.batch_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'batch_results')
        os.makedirs(self.batch_dir, exist_ok=True)
    
    def process_batch(self, pdf_files, use_ai=False, max_workers=4):
        """
        Process a batch of PDF files.
        
        Args:
            pdf_files (list): List of file paths to process
            use_ai (bool): Whether to use AI-enhanced parsing
            max_workers (int): Maximum number of concurrent workers
            
        Returns:
            dict: Results from batch processing
        """
        batch_id = str(uuid.uuid4())
        results = []
        
        # Process files in parallel
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = []
            for pdf_path in pdf_files:
                futures.append(
                    executor.submit(self._process_single_file, pdf_path, use_ai)
                )
            
            # Collect results as they complete
            for future in futures:
                results.append(future.result())
        
        # Save batch results
        batch_result = {
            'batch_id': batch_id,
            'statements': results,
            'statistics': self._calculate_statistics(results)
        }
        
        # Save to file
        self._save_batch_result(batch_id, batch_result)
        
        return batch_result
    
    def _process_single_file(self, pdf_path, use_ai):
        """Process a single PDF file."""
        parser = self.ai_parser if use_ai else self.traditional_parser
        return parser.parse_pdf(pdf_path)
    
    def _calculate_statistics(self, results):
        """Calculate statistics for batch results."""
        total_statements = len(results)
        valid_statements = sum(1 for r in results if r.get('validation', {}).get('is_valid', False))
        
        total_transactions = sum(len(r.get('transactions', [])) for r in results)
        
        # Calculate total credits and debits
        total_credits = 0
        total_debits = 0
        
        for statement in results:
            for transaction in statement.get('transactions', []):
                amount = transaction.get('amount', 0)
                direction = transaction.get('direction', '').lower()
                
                if direction == 'credit':
                    total_credits += amount
                elif direction == 'debit':
                    total_debits += amount
        
        # Identify statements with highest variance
        max_variance = 0
        max_variance_statement = None
        
        for i, statement in enumerate(results):
            validation = statement.get('validation', {})
            if validation and validation.get('expected_ending_balance') is not None:
                expected = validation.get('expected_ending_balance')
                calculated = validation.get('calculated_ending_balance')
                
                if expected != 0:  # Avoid division by zero
                    variance = abs((calculated - expected) / expected) * 100
                    if variance > max_variance:
                        max_variance = variance
                        max_variance_statement = {
                            'index': i,
                            'expected': expected,
                            'calculated': calculated,
                            'variance': variance
                        }
        
        return {
            'total_statements': total_statements,
            'valid_statements': valid_statements,
            'invalid_statements': total_statements - valid_statements,
            'total_transactions': total_transactions,
            'total_credits': total_credits,
            'total_debits': total_debits,
            'highest_variance': max_variance_statement
        }
    
    def _save_batch_result(self, batch_id, batch_result):
        """Save batch results to file."""
        batch_file = os.path.join(self.batch_dir, f"{batch_id}.json")
        
        with open(batch_file, 'w') as f:
            json.dump(batch_result, f, indent=2)
        
        return batch_file
    
    def get_batch_result(self, batch_id):
        """Retrieve a previously processed batch result."""
        batch_file = os.path.join(self.batch_dir, f"{batch_id}.json")
        
        if os.path.exists(batch_file):
            with open(batch_file, 'r') as f:
                return json.load(f)
        
        return None
    
    def generate_summary_report(self, batch_id):
        """Generate a summary report for a batch."""
        batch_result = self.get_batch_result(batch_id)
        
        if not batch_result:
            return None
        
        # Generate the summary report data
        statements = batch_result.get('statements', [])
        statistics = batch_result.get('statistics', {})
        
        # Group statements by variance range
        variance_groups = {
            'no_variance': 0,
            'low_variance': 0,
            'medium_variance': 0,
            'high_variance': 0,
            'invalid': 0
        }
        
        for statement in statements:
            validation = statement.get('validation', {})
            if not validation.get('is_valid', False):
                variance_groups['invalid'] += 1
                continue
                
            expected = validation.get('expected_ending_balance')
            calculated = validation.get('calculated_ending_balance')
            
            if expected == 0:
                variance = 0 if calculated == 0 else 100
            else:
                variance = abs((calculated - expected) / expected) * 100
            
            if variance == 0:
                variance_groups['no_variance'] += 1
            elif variance < 1:
                variance_groups['low_variance'] += 1
            elif variance <= 5:
                variance_groups['medium_variance'] += 1
            else:
                variance_groups['high_variance'] += 1
        
        # Create the summary report
        summary_report = {
            'batch_id': batch_id,
            'statistics': statistics,
            'variance_distribution': variance_groups,
            'recommendations': []
        }
        
        # Generate recommendations based on analysis
        if statistics.get('invalid_statements', 0) > 0:
            summary_report['recommendations'].append(
                "Some statements have invalid balance calculations. Review these statements for possible errors."
            )
        
        if variance_groups['high_variance'] > 0:
            summary_report['recommendations'].append(
                f"Found {variance_groups['high_variance']} statements with high variance (>5%). These require immediate review."
            )
        
        # Save the summary report
        report_file = os.path.join(self.batch_dir, f"{batch_id}_summary.json")
        with open(report_file, 'w') as f:
            json.dump(summary_report, f, indent=2)
        
        return summary_report

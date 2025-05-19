from flask import Blueprint, request, jsonify, send_file
import os
import csv
import io
import tempfile
import uuid
import pandas as pd
from .parser import BankStatementParser
from .ai_parser import AIBankStatementParser
from .batch_processing import BatchProcessor

main = Blueprint('main', __name__)
batch_processor = BatchProcessor()

@main.route('/api/extract-pdf', methods=['POST'])
def extract_pdf():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    # Check if the user wants to use AI parsing
    use_ai = request.form.get('use_ai', 'false').lower() == 'true'

    if file and file.filename.endswith('.pdf'):
        try:
            # Create a temporary folder to save the uploaded file
            temp_folder = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'temp_uploads')
            os.makedirs(temp_folder, exist_ok=True)
            
            # Save the file temporarily
            temp_path = os.path.join(temp_folder, file.filename)
            file.save(temp_path)
            
            # Choose the appropriate parser
            if use_ai:
                parser = AIBankStatementParser()
            else:
                parser = BankStatementParser()
                
            result = parser.parse_pdf(temp_path)
            
            # Clean up the temporary file
            os.remove(temp_path)
            
            return jsonify(result), 200
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    else:
        return jsonify({'error': 'File must be a PDF'}), 400


@main.route('/api/batch-extract-pdfs', methods=['POST'])
def batch_extract_pdfs():
    if 'files' not in request.files:
        return jsonify({'error': 'No files part'}), 400
    
    files = request.files.getlist('files')
    if not files or files[0].filename == '':
        return jsonify({'error': 'No selected files'}), 400
    
    # Check if the user wants to use AI parsing
    use_ai = request.form.get('use_ai', 'false').lower() == 'true'
    
    # Check if all files are PDFs
    for file in files:
        if not file.filename.endswith('.pdf'):
            return jsonify({'error': 'All files must be PDFs'}), 400
    
    try:
        # Create a temporary folder to save the uploaded files
        temp_folder = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'temp_uploads')
        os.makedirs(temp_folder, exist_ok=True)
        
        # Save the files temporarily
        temp_paths = []
        for file in files:
            temp_path = os.path.join(temp_folder, file.filename)
            file.save(temp_path)
            temp_paths.append(temp_path)
        
        # Process the batch
        batch_result = batch_processor.process_batch(temp_paths, use_ai)
        
        # Clean up the temporary files
        for temp_path in temp_paths:
            os.remove(temp_path)
        
        return jsonify(batch_result), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@main.route('/api/generate-summary/<batch_id>', methods=['GET'])
def generate_summary(batch_id):
    try:
        summary = batch_processor.generate_summary_report(batch_id)
        if summary:
            return jsonify(summary), 200
        else:
            return jsonify({'error': 'Batch not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@main.route('/api/export/csv/<batch_id>', methods=['GET'])
def export_csv(batch_id):
    try:
        batch_result = batch_processor.get_batch_result(batch_id)
        if not batch_result:
            return jsonify({'error': 'Batch not found'}), 404
        
        statements = batch_result.get('statements', [])
        
        # Flatten the transactions for export
        flattened_data = []
        for idx, statement in enumerate(statements):
            for transaction in statement.get('transactions', []):
                flattened_data.append({
                    'StatementID': idx + 1,
                    'Date': transaction.get('date', ''),
                    'Description': transaction.get('description', ''),
                    'Amount': transaction.get('amount', 0),
                    'Direction': transaction.get('direction', ''),
                    'StartingBalance': statement.get('starting_balance', 0),
                    'EndingBalance': statement.get('ending_balance', 0),
                    'IsValid': 'Yes' if statement.get('validation', {}).get('is_valid', False) else 'No'
                })
        
        # Create a CSV in memory
        output = io.StringIO()
        if flattened_data:
            writer = csv.DictWriter(output, fieldnames=flattened_data[0].keys())
            writer.writeheader()
            writer.writerows(flattened_data)
        
        # Create a response with the CSV data
        mem = io.BytesIO()
        mem.write(output.getvalue().encode('utf-8'))
        mem.seek(0)
        output.close()
        
        return send_file(
            mem,
            mimetype='text/csv',
            as_attachment=True,
            download_name=f'bank_statement_transactions_{batch_id}.csv'
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@main.route('/api/export/excel/<batch_id>', methods=['GET'])
def export_excel(batch_id):
    try:
        batch_result = batch_processor.get_batch_result(batch_id)
        if not batch_result:
            return jsonify({'error': 'Batch not found'}), 404
        
        statements = batch_result.get('statements', [])
        
        # Flatten the transactions for export
        flattened_data = []
        for idx, statement in enumerate(statements):
            for transaction in statement.get('transactions', []):
                flattened_data.append({
                    'StatementID': idx + 1,
                    'Date': transaction.get('date', ''),
                    'Description': transaction.get('description', ''),
                    'Amount': transaction.get('amount', 0),
                    'Direction': transaction.get('direction', ''),
                    'StartingBalance': statement.get('starting_balance', 0),
                    'EndingBalance': statement.get('ending_balance', 0),
                    'IsValid': 'Yes' if statement.get('validation', {}).get('is_valid', False) else 'No'
                })
        
        # Create a pandas DataFrame and an Excel file
        df = pd.DataFrame(flattened_data)
        
        # Create a temporary file
        with tempfile.NamedTemporaryFile(suffix='.xlsx', delete=False) as tmpfile:
            excel_path = tmpfile.name
            with pd.ExcelWriter(excel_path, engine='xlsxwriter') as writer:
                df.to_excel(writer, sheet_name='Transactions', index=False)
                
                # Auto-adjust columns' width
                worksheet = writer.sheets['Transactions']
                for i, col in enumerate(df.columns):
                    max_len = max(df[col].astype(str).apply(len).max(), len(str(col))) + 2
                    worksheet.set_column(i, i, max_len)
        
        # Send the Excel file as a response
        return send_file(
            excel_path,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name=f'bank_statement_transactions_{batch_id}.xlsx'
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500

from flask import Blueprint, request, jsonify
import os
from .parser import BankStatementParser
from .ai_parser import AIBankStatementParser

main = Blueprint('main', __name__)

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

from flask import Flask, render_template, request, stream_with_context, jsonify
import webbrowser
import json
import openai

app = Flask(__name__)

current_model = 'gpt-4o-mini'
@app.route('/update_model', methods=['POST'])
def update_model():
    global current_model
    data = request.json
    current_model = data.get('model', 'gpt-4o-mini')
    return jsonify({'model': current_model})

@app.route('/update_temperature', methods=['POST'])
def update_temperature():
    global temperature
    data = request.json
    temperature = data.get('temperature', 0.3)
    return jsonify({'temperature': temperature})

@app.route('/')
def index():
    return render_template('index.html')

def open_browser():
    webbrowser.open('http://127.0.0.1:5000')

SYSTEM_ROLE = """Eres un asistente virtual. Tienes como contexto celdas de notebook en texto y código (normalmente python),
 donde la primera es [0], la segunda [1], etc."""

#SYSTEM_ROLE = """You are a virtual assistant. You have as context notebook cells in text and code (usually python),
# where the first one is [0], the second one [1], and so on."""

@app.route('/', methods=['POST'])
def chat():
    global current_model
    global temperature
    data = request.json
    context = data.get('context', '')
    question = data.get('question', '')
    chat_history = data.get('chat_history', [])

    messages = [
        {"role": "system", "content": SYSTEM_ROLE},
        {"role": "user", "content": f"Contexto:{context}"},
    ] + chat_history + [
        {"role": "user", "content": question}
    ]

    def generate():
        response = openai.chat.completions.create(
            model=current_model,
            messages=messages,
            temperature=temperature,
            n=1,
            max_tokens=3500,
            stream=True
        )

        full_response = ""
        for chunk in response:
            if hasattr(chunk.choices[0].delta, 'content'):
                content = chunk.choices[0].delta.content
                if content is not None:
                    full_response += content
                    yield f"data: {json.dumps({'content': content})}\n\n"
        
        yield f"data: {json.dumps({'full_response': full_response})}\n\n"

    return app.response_class(stream_with_context(generate()), content_type='text/event-stream')

if __name__ == '__main__':
    open_browser()
    app.run(debug=True, use_reloader=False)
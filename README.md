# Nbchat

**Nbchat** has been created as a tool to make working with `.ipynb` files easier for students and anyone interested in understanding or discussing these notebooks. As a current data science student, I frequently rely on large language models (LLMs), but there's often friction in this process. Nbchat aims to smooth out this experience and address some issues found in similar tools, such as GitHub Copilot.

## What does Nbchat offer and solve?

This web application provides more customization than many other tools. First, you can configure the behavior of your virtual assistant by modifying the `SYSTEM_ROLE` variable in the `app.py` file. The default setting is in Spanish, but you can uncomment the English version or create your own in any language. 

Second, as a user, you can access the "brain" icon to adjust model settings and temperature, giving you control over how the LLM responds. This customization helps prevent frustration when the LLM gets stuck in repetitive response loops.

Nbchat also includes a simple, fast, and dynamic system for controlling what content the LLM can access to answer your queries, helping address issues related to context windows and undesired responses.

Finally, it creates a workspace that allows you to focus solely on the `.ipynb` file, the chat, or both by resizing each section to suit your preferences.

## Limitations

- Currently, it only integrates with OpenAI's API.  
- **Important:** Nbchat does not run a virtual console to execute code — it is read-only.  
- Occasionally, it may not handle window resizing well. If this happens, hide and show the chat again by clicking the chat button or using `Ctrl+S`.  
- There's limited feedback between the UI and the server if it fails to connect to the API. If a response takes more than three seconds to arrive, I recommend checking the server console.

## Getting Started

Since each user will have their own OpenAI API key, you'll need to define yours. While it's possible to add this key in the `app.py` file, I recommend following the simple instructions in [step 4 of OpenAI's API key safety guide](https://help.openai.com/en/articles/5112595-best-practices-for-api-key-safety#:~:text=key%20safety%20measure.-,4.%20Use%20Environment%20Variables%20in%20place%20of%20your%20API%20key,-An%20environment%20variable).

To start, navigate to this repository via the terminal and run `app.py`.

## How It Works

On the left, you'll find a menu button with options to load and save the current document as a `.ipynb` file. You can also save the current state of the page as a `.nbchat` file, which stores both the notebook cells and the ongoing chat history.

On the right, there's the "brain" button to configure the model and temperature of the API. You'll also see a chat button that toggles the chat window, which you can resize by dragging or expanding using the left arrow (`Ctrl+Left`). If you hide the chat using the chat button or `Ctrl+S`, the last size you set will be saved.

### Chats and AI Context:

- There is a general chat where the AI will use all cells marked in green as its context. If you'd prefer to exclude certain cells, simply click on the green area to toggle its status. This can be done at any point in the conversation, and the structure will update with each new user message.
- You can also open a chat tied to individual cells by clicking the chat button beneath each one. In this case, the AI will only have access to that specific cell's content, regardless of whether it’s marked in red or green.

The central buttons in the notebook are designed to perform actions on all selected cells.

## Additional Notes

If you want to change the default model and/or the initial temperature, you can modify the values in `chat.js`:

```javascript
let currentModel = "gpt-4o-mini";  
let temperature = 0.3;
```

Please note that this project is current as of September 22, 2024 (with the o1 models unavailable), so features like displaying reasoning chains from o1 models are not included.

## Developer's Note

This was my summer project for 2024, just before starting my third year of Applied Data Science. It’s my first project involving HTML, JS, CSS, and Flask—all of which were new to me. Although it is not a professional product, it is good enough for me to use it personally over other tools, as it allows the use of powerful models without limitations of use and at virtually no cost (if you use the 4o series). I hope you find it useful as well.

Enjoy!

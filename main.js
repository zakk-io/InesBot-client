const chat = document.getElementById('chat');
const input = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');



let room_id
room_id = localStorage.getItem('room_id');
if (!room_id){
  room_id = crypto.randomUUID()
  localStorage.setItem("room_id",room_id)
}




const getRoomMessages = async () => {
  try {
    const resposne = await fetch(`https://inesbot-api.onrender.com/api/rooms/${room_id}/messages`)
    const data = await resposne.json()
    if(data.code === 200){
       data.messages.forEach(m => addMessage(m.text, m.sender));
    }

  } catch (error) {
    console.error(error)
  }
}



const pushMessages = async (data) => {
  try {
    await fetch(`https://inesbot-api.onrender.com/api/rooms/${room_id}/messages`,{
      method : "POST",
      body : JSON.stringify(data),
      headers : {
        'Content-Type':'application/json'
      }
    })
  } catch (error) {
    console.error(error)
  }
}




import { GoogleGenAI } from "@google/genai";

//search with google 
const groundingTool = {
  googleSearch: {},
};

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API });

const BotResponseMessage = async (msg) => {
  try {

    //fetch old chat history form database
    const res = await fetch(`https://inesbot-api.onrender.com/api/rooms/${room_id}/messages`);
    const data = await res.json()
    
    const history = data.messages

    //old chat history
    //the bot dose not have memory so you need to send the old chat history with every request to make context
    const contents = history.map(m => ({
      role: m.sender === 'user' ? 'user' : 'model',
      parts: [{ text: m.text }]
    }));

    //only answer about INES‑Ruhengeri 
    contents.push({
      role: 'model',
      parts: [{
        text: `You are an expert assistant for INES‑Ruhengeri University.
        provide answers about INES INES‑Ruhengeri University. 
        make sure to access the internet to search information about NES‑Ruhengeri University"`
      }]
    });

    //new user message
    const user_message = msg
    contents.push({
      role: 'user',
      parts: [{ text: user_message }]
    });


    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents,
      config: {
        tools: [groundingTool],
      },
    });

    const text = response.text

    addMessage(text,'bot')

    //call api endpoint to save bot message in the database
    pushMessages({
      "sender": "bot",
      "text": text
    })
  } catch (error) {
    console.error(error)
  }
}



function addMessage(text, sender) {
  const msgDiv = document.createElement('div');
  msgDiv.classList.add('message', sender);

  const avatar = document.createElement('img');
  avatar.src = sender === 'bot'
    ? 'https://www.ines.ac.rw/static/images/ines.png'
    : `https://robohash.org/${encodeURIComponent(room_id)}?set=set1&size=80x80`;
  avatar.alt = sender === 'bot' ? 'Bot Avatar' : 'User Avatar';
  avatar.classList.add('avatar');

  const textDiv = document.createElement('div');
  textDiv.classList.add('text');
  textDiv.textContent = text;

  msgDiv.appendChild(avatar);
  msgDiv.appendChild(textDiv);
  chat.appendChild(msgDiv);
  chat.scrollTop = chat.scrollHeight;
}



sendBtn.addEventListener('click', () => {
  const msg = input.value.trim();
  if (!msg) return;

  addMessage(msg, 'user');

  //call api endpoint to save user message in the database
  pushMessages({
    "sender": "user",
    "text": msg
  })

  //response from the bot api
  BotResponseMessage(msg)

  input.value = '';
});




window.onload = () => {
  chat.scrollTop = chat.scrollHeight;
};

getRoomMessages()


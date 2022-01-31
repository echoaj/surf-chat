/* ------------------- REACT LIBRARIES ------------------- */
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import React, { useEffect, useRef, useState } from "react";
import "./App.css";
/* ------------------- SOCKET.IO LIBRARY ------------------- */
import io from "socket.io-client";
/* ------------------- FIREBASE LIBRARIES ------------------- */
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import { getAnalytics } from "firebase/analytics";
import { useCollectionData } from 'react-firebase-hooks/firestore';
/* ------------------- UUID LIBRARY------------------- */
import uuid from 'react-uuid';

// TODO: Encryption
// TODO: Background Changer
// TODO: Fix RealTimeChat Scroll
// TODO: Info Button
// TODO: Main Menu
// TODO: Mobile Support
// TODO: Deployment on Firebase
// TODO: Hide API firebase Key
// const URL = "http://localhost:4000";
const URL = "https://surf-chat-jsb.herokuapp.com";


// Firebase Config and Initialization
const firebaseConfig = {
	apiKey: "AIzaSyDPGHaRAjs5qIF_SegQEwCEWMpVeBzgaOY",
	authDomain: "surf-chat.firebaseapp.com",
	projectId: "surf-chat",
	storageBucket: "surf-chat.appspot.com",
	messagingSenderId: "257669922888",
	appId: "1:257669922888:web:e9ef4acec3d2ddf373587d",
	measurementId: "G-VBYTFP90JQ"
};
const app = firebase.initializeApp(firebaseConfig);
const firestore = firebase.firestore();
getAnalytics(app);

// Unique ID for the user
const userUUID = uuid();

function App() {
	return (
		<div className="App">
			<Chat />
		</div>
	);
}

// React Routing
function Chat() {
	return (
		<Router>
			<header>
				<h2>Surf-Chat</h2>
				<div>
					{/* Used as buttons to route user the routes below. */}
					<Link className="link" to="/chat/traditional">Traditional</Link>
					<Link className="link" to="/chat/real-time">Real-Time</Link>
				</div>
			</header>
			<section>
				<Routes>
					{/* A certain react component will be rendered depending on what route user goes to. */}
					<Route path="/chat/real-time" element={<RealTimeChatRoom />} />
					<Route path="/chat/traditional" element={<TraditionalChatRoom />} />
				</Routes>
			</section>
		</Router>
	);
}

function RealTimeChatRoom() {
	const [chat, setChat] = useState([]);	// list of { chat messages }
	const [state, setState] = useState({ message: "" }); // state for input
	const [, setdummyState] = useState();	// used for force render
	const socketRef = useRef();
	const dummy = useRef();

	useEffect(
		() => {
			socketRef.current = io.connect(URL);
			socketRef.current.on("message-signal", ({ userUUID, message, msgID }) => {
				let userID = userUUID;
				let text = message;
				setChat([...chat, { userID, text, msgID }]);
			});
			socketRef.current.on("message-delete", (msgID) => {
				chat.forEach((msg, index) => {
					if (msg.msgID === msgID) {
						chat.splice(index, 1);
					}
				});
				setdummyState({});	// Force a rerender
			});
			return () => socketRef.current.disconnect();
		}, [chat]
	);

	const onMessageSubmit = (e) => {
		const { message } = state;
		const msgID = uuid();
		socketRef.current.emit("message-signal", { userUUID, message, msgID });
		e.preventDefault();
		setState({ message: "" });
		dummy.current.scrollIntoView({ behavior: 'smooth' });
	};

	const onMessageDelete = (msgID) => {
		socketRef.current.emit('message-delete', msgID);
	};

	return (<>
		<main className='chat-main'>
			{chat.map((msg, index) => <ChatMessageRealTime key={index} message={msg} collection={{ onMessageDelete, index }} />)}
			<span ref={dummy}></span>
		</main>

		<form className='chat-form' onSubmit={onMessageSubmit}>
			<input className='chat-input' value={state.message} placeholder='🏄'
				onChange={(e) => setState({ "message": e.target.value })} />
			<button className='chat-button' type="submit" disabled={!state.message}>
				<span role="img" aria-label="wave">🌊</span>
			</button>
		</form>
	</>
	);
}


function TraditionalChatRoom() {
	const dummy = useRef();
	const messagesRef = firestore.collection('messages');
	const query = messagesRef.orderBy('createdAt');//.limit(20);
	const [messages] = useCollectionData(query, { idField: 'id' });
	const [formValue, setFormValue] = useState('');

	const sendMessage = async (e) => {
		e.preventDefault();
		await messagesRef.add({
			userID: userUUID,
			text: formValue,
			createdAt: firebase.firestore.FieldValue.serverTimestamp()
		});
		setFormValue('');
		dummy.current.scrollIntoView({ behavior: 'smooth' });
	};

	return (<>
		<main className='chat-main'>
			{messages && messages.map(msg => <ChatMessageTraditional key={msg.id} message={msg} />)}
			<span ref={dummy}></span>
		</main>

		<form className='chat-form' onSubmit={sendMessage}>
			<input className='chat-input' placeholder='🏄' value={formValue}
				onChange={(e) => setFormValue(e.target.value)} />
			<button className='chat-button' type="submit" disabled={!formValue}>
				<span role="img" aria-label="wave">🌊</span>
			</button>
		</form>
	</>);
}


function ChatMessageTraditional(props) {
	const { text, id, userID } = props.message;
	const messagesRef = firestore.collection('messages');
	const messageClass = userID === userUUID ? 'sent' : 'received';

	return (<>
		<div className={`message ${messageClass}`}>
			<button onClick={() => { messagesRef.doc(id).delete(); }}>x</button>
			<p>{text}</p>
		</div>
	</>);
}


function ChatMessageRealTime(props) {
	const { onMessageDelete } = props.collection;
	const { userID, text, msgID } = props.message;
	const messageClass = userID === userUUID ? 'sent' : 'received';

	return (<>
		<div className={`message ${messageClass}`}>
			<button onClick={() => { onMessageDelete(msgID); }}>x</button>
			<p>{text}</p>
		</div>
	</>);
}

export default App;



import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { joinRoom as joinRoomNostr } from 'trystero/nostr';
import { joinRoom as joinRoomTorrent } from 'trystero/torrent';
import { joinRoom as joinRoomIPFS } from 'trystero/ipfs';
import { joinRoom as joinRoomMQTT } from 'trystero/mqtt';

function App() {
  const [status, setStatus] = useState('not connected'); // 'not connected' | 'connecting' | 'connected'
  const [notification, setNotification] = useState('');
  const [peers, setPeers] = useState([]);
  const [room, setRoom] = useState('');
  const roomInstanceRef = React.useRef(null);

  async function connectWithStrategy(strategy, roomName) {
  try {
    let joinRoom;
    switch (strategy) {
      case 'nostr':
        joinRoom = joinRoomNostr;
        break;
      case 'torrent':
        joinRoom = joinRoomTorrent;
        break;
      case 'ipfs':
        joinRoom = joinRoomIPFS;
        break;
      case 'mqtt':
        joinRoom = joinRoomMQTT;
        break;
      default:
        throw new Error(`Unknown strategy: ${strategy}`);
    }
    const config = { appId: 'sfc-app-id' };
    console.log(`Attempting connection with ${strategy} strategy...`);
    const room = await Promise.race([
      joinRoom(config, roomName),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000)),
    ]);
    console.log(`${strategy} connection successfully established`);
    return { success: true, room, strategy };
  } catch (error) {
    setNotification(`${strategy} connection failed: ${error.message}`);
    console.warn(`${strategy} connection failed: ${error.message}`);
    return { success: false, error };
  }
}

  // Dummy initCall method
  async function initCall() {
    setNotification('Connecting...');
    setStatus('connecting');

    const strategies = ['nostr', 'torrent', 'ipfs', 'mqtt'];
    const roomName = room || 'default-room';
    
    let roomInstance;
    for (const strategy of strategies) {
        const result = await connectWithStrategy(strategy, roomName);
        if (result.success) {
            roomInstance = result.room;
            break;
        }
    }
    
    if (!roomInstance) {
        setNotification('All connection strategies failed');
        setStatus('not connected');
        return;
    }
    // const roomInstance = joinRoom(
    //     config,
    //     room || 'default-room',
    //     (error) => {
    //         console.log(error)
    //         setNotification('Connection failed');
    //     }
    // );
    roomInstanceRef.current = roomInstance;
    
    ////////
    // this object can store audio instances for later
    const peerAudios = {};

    // get a local audio stream from the microphone
    const selfStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false
    });

    // send stream to peers currently in the room
    roomInstance.addStream(selfStream);

    // handle streams from other peers
    roomInstance.onPeerStream((stream, peerId) => {
      // create an audio instance and set the incoming stream
      const audio = new Audio();
      audio.srcObject = stream;
      audio.autoplay = true;
      peerAudios[peerId] = audio;
    });

    roomInstance.onPeerJoin(peerId => {
      roomInstance.addStream(selfStream, peerId); //audio stream to new peer
      setPeers(prevPeers => [...prevPeers, peerId]);
      setNotification(`${peerId} joined`);
      setTimeout(() => setNotification(''), 2000);
    });
    roomInstance.onPeerLeave(peerId => {
      roomInstance.removeStream(selfStream, peerId); //stop sending audio to that peer
      setPeers(prevPeers => prevPeers.filter(p => p !== peerId));
      setNotification(`${peerId} left`);
      setTimeout(() => setNotification(''), 2000);
    });

    setTimeout(() => {
      setStatus('connected');
      setNotification('Connected!');
      setTimeout(() => setNotification(''), 2000);
    }, 1200);
  }

  function disconnect() {
    roomInstanceRef.current.leave();
    setStatus('not connected');
    setNotification('Disconnected');
    setPeers([]);
    setTimeout(() => setNotification(''), 2000);
  }

  function handleRoomChange(e) {
    setRoom(e.target.value);
  }

  function handleRoomKeyDown(e) {
    if (e.key === 'Enter') {
      initCall();
    }
  }

  let statusClass = 'status ' + status.replace(' ', '-');

  return (
    React.createElement('div', { className: 'container' },
      React.createElement('div', { className: statusClass }, 'Connection status: ' + status),
      React.createElement('div', { className: 'notifications' }, notification),
      React.createElement('div', { className: 'peers-list' },
        React.createElement('div', null, 'Connected peers:'),
        peers.length === 0
          ? React.createElement('div', { className: 'no-peers', style: { color: '#888', fontStyle: 'italic', marginTop: 4, marginBottom: 4 } }, 'No peers connected')
          : React.createElement('ul', null,
              peers.map((peer, i) => React.createElement('li', { key: i }, peer))
            )
      ),
      status !== 'connected'
        ? [
            React.createElement('div', { className: 'room-input', key: 'input' },
              React.createElement('input', {
                type: 'text',
                placeholder: 'Enter room name...',
                value: room,
                onChange: handleRoomChange,
                onKeyDown: handleRoomKeyDown
              })
            ),
            React.createElement('button', {
              className: 'connect-btn',
              onClick: initCall,
              key: 'connect-btn'
            }, 'Connect')
          ]
        : [
            React.createElement('div', { className: 'room-name', key: 'room-name', style: { marginBottom: 20, fontWeight: 'bold', fontSize: '1.1rem' } },
              'Room: ' + (room || '(unnamed)')
            ),
            React.createElement('button', {
              className: 'disconnect-btn',
              onClick: disconnect,
              key: 'disconnect-btn'
            }, 'Disconnect')
          ]
    )
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));

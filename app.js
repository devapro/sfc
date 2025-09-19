
import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { joinRoom } from 'trystero';


function App() {
  const [status, setStatus] = useState('not connected'); // 'not connected' | 'connecting' | 'connected'
  const [notification, setNotification] = useState('');
  const [peers, setPeers] = useState([]);
  const [room, setRoom] = useState('');
  const [peerTalking, setPeerTalking] = useState(false); // global indicator: any peer talking
  const [userTalking, setUserTalking] = useState(false); // user talking indicator
  const roomInstanceRef = React.useRef(null);

  // Dummy initCall method
  async function initCall() {
    setNotification('Connecting...');
    setStatus('connecting');

    const config = { appId: 'sfc-app-id' };
    const roomInstance = joinRoom(config, room || 'default-room');
    roomInstanceRef.current = roomInstance;

    // this object can store audio instances for later
    const peerAudios = {};
    const peerAnalyzers = {};

    // get a local audio stream from the microphone
    const selfStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false
    });

    // --- USER TALKING INDICATOR ---
    // Use Web Audio API to detect if user is talking
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    const source = audioCtx.createMediaStreamSource(selfStream);
    source.connect(analyser);
    const dataArray = new Uint8Array(analyser.fftSize);

    let userTalkingInterval = setInterval(() => {
      analyser.getByteTimeDomainData(dataArray);
      // Calculate RMS (root mean square) to detect volume
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        let val = (dataArray[i] - 128) / 128;
        sum += val * val;
      }
      let rms = Math.sqrt(sum / dataArray.length);
      setUserTalking(rms > 0.08); // threshold, tune as needed
    }, 120);

    // send stream to peers currently in the room
    roomInstance.addStream(selfStream);

    // --- PEER TALKING INDICATOR ---
    // handle streams from other peers
    roomInstance.onPeerStream((stream, peerId) => {
      // create an audio instance and set the incoming stream
      const audio = new Audio();
      audio.srcObject = stream;
      audio.autoplay = true;
      peerAudios[peerId] = audio;

      // Analyze peer stream for activity
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const src = ctx.createMediaStreamSource(stream);
      const an = ctx.createAnalyser();
      an.fftSize = 2048;
      src.connect(an);
      const arr = new Uint8Array(an.fftSize);
      peerAnalyzers[peerId] = { ctx, an, arr };
    });

    // Remove analyzer on peer leave
    roomInstance.onPeerLeave(peerId => {
      roomInstance.removeStream(selfStream, peerId); //stop sending audio to that peer
      setPeers(prevPeers => prevPeers.filter(p => p !== peerId));
      setNotification(`${peerId} left`);
      setTimeout(() => setNotification(''), 2000);
      if (peerAnalyzers[peerId]) {
        peerAnalyzers[peerId].ctx.close();
        delete peerAnalyzers[peerId];
      }
    });

    // Add peer on join
    roomInstance.onPeerJoin(peerId => {
      roomInstance.addStream(selfStream, peerId); //audio stream to new peer
      setPeers(prevPeers => [...prevPeers, peerId]);
      setNotification(`${peerId} joined`);
      setTimeout(() => setNotification(''), 2000);
    });

    // Poll all peer analyzers for activity
    let peerTalkingInterval = setInterval(() => {
      let anyTalking = false;
      for (let k in peerAnalyzers) {
        let { an, arr } = peerAnalyzers[k];
        an.getByteTimeDomainData(arr);
        let sum = 0;
        for (let i = 0; i < arr.length; i++) {
          let val = (arr[i] - 128) / 128;
          sum += val * val;
        }
        let rms = Math.sqrt(sum / arr.length);
        if (rms > 0.08) { // threshold, tune as needed
          anyTalking = true;
          break;
        }
      }
      setPeerTalking(anyTalking);
    }, 120);

    // Clean up intervals and audio contexts on disconnect
    roomInstanceRef.current = {
      ...roomInstance,
      _cleanup: () => {
        clearInterval(userTalkingInterval);
        clearInterval(peerTalkingInterval);
        audioCtx.close();
        Object.values(peerAnalyzers).forEach(({ ctx }) => ctx.close());
      }
    };

    setTimeout(() => {
      setStatus('connected');
      setNotification('Connected!');
      setTimeout(() => setNotification(''), 2000);
    }, 1200);
  }

  function disconnect() {
    if (roomInstanceRef.current) {
      if (roomInstanceRef.current._cleanup) roomInstanceRef.current._cleanup();
      roomInstanceRef.current.leave();
    }
    setStatus('not connected');
    setNotification('Disconnected');
    setPeers([]);
    setPeerTalking(false);
    setUserTalking(false);
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
        React.createElement('ul', null,
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
            React.createElement('div', {
              className: 'room-name',
              key: 'room-name',
              style: { marginBottom: 20, fontWeight: 'bold', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: 8 }
            },
              'Room: ' + (room || '(unnamed)'),
              // Indicators
              React.createElement('span', {
                className: 'dot-indicator user-dot',
                title: 'You are talking',
                style: {
                  marginLeft: 10,
                  background: userTalking ? '#e74c3c' : '#eee',
                  border: '1.5px solid #e74c3c',
                  width: 13, height: 13, borderRadius: '50%', display: 'inline-block', transition: 'background 0.2s'
                }
              }),
              React.createElement('span', {
                className: 'dot-indicator peer-dot',
                title: 'Peer is talking',
                style: {
                  marginLeft: 4,
                  background: peerTalking ? '#2ecc40' : '#eee',
                  border: '1.5px solid #2ecc40',
                  width: 13, height: 13, borderRadius: '50%', display: 'inline-block', transition: 'background 0.2s'
                }
              })
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

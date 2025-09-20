
import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { joinRoom } from 'trystero';

const params = new URLSearchParams(window.location.search);
const roomName = params.get('room');

function App() {
  const [status, setStatus] = useState('not connected'); // 'not connected' | 'connecting' | 'connected'
  const [notification, setNotification] = useState('');
  const [peers, setPeers] = useState([]);
  const [room, setRoom] = useState(roomName || '');
  const roomInstanceRef = React.useRef(null);
  const selfStreamRef = React.useRef(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const prevSpaceKeyPressedRef = React.useRef(false);
  // Auto-connect if ?room= is present in URL
  React.useEffect(() => {
    if (roomName && roomName.trim() !== '') {
      setTimeout(() => { initCall(); }, 100);
    }
    // eslint-disable-next-line
  }, []);
  // Handle spacebar press/release for mic toggle
  React.useEffect(() => {

    function handleKeyDown(e) {
      if (e.code === 'Space' && status === 'connected') {
        if (selfStreamRef.current && prevSpaceKeyPressedRef.current === false) {
            console.log('space down');
            prevSpaceKeyPressedRef.current = true;
            toggleMic();
        }
      }
    }
    function handleKeyUp(e) {
      if (e.code === 'Space' && status === 'connected') {
        if (selfStreamRef.current && prevSpaceKeyPressedRef.current === true) {
            console.log('space up');
            prevSpaceKeyPressedRef.current = false;
            toggleMic();
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [status]);

  // Dummy initCall method
  async function initCall() {
    setNotification('Connecting...');
    setStatus('connecting');

    let roomName = room;
    if (!roomName || roomName.trim() === '') {
      roomName = 'room-' + Math.random().toString(36).slice(2, 10);
      setRoom(_ => roomName);
    }
    roomName = roomName.trim();
    // Set query parameter for room
    if (window && window.history && window.location) {
      const url = new URL(window.location.href);
      url.searchParams.set('room', roomName);
      window.history.replaceState({}, '', url);
    }
    const config = { appId: 'sfc-app-id' };
    const roomInstance = joinRoom(config, roomName);
    roomInstanceRef.current = roomInstance;
    
    ////////
    // this object can store audio instances for later
    const peerAudios = {};

    // get a local audio stream from the microphone
    const selfStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false
    });
    selfStreamRef.current = selfStream;
    setMicEnabled(true);

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
    setMicEnabled(true);
    if (selfStreamRef.current) {
      selfStreamRef.current.getTracks().forEach(track => track.stop());
      selfStreamRef.current = null;
    }
    setTimeout(() => setNotification(''), 2000);
  }

  function toggleMic() {
    if (!selfStreamRef.current) return;
    const audioTracks = selfStreamRef.current.getAudioTracks();
    if (audioTracks.length > 0) {
      const enabled = !audioTracks[0].enabled;
      audioTracks[0].enabled = enabled;
      setMicEnabled(enabled);
      console.log('mic enabled:', enabled);
    }
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
        status === 'connected' ? React.createElement('div', null, 'Connected peers:') : null,
        peers.length === 0 && status === 'connected'
          ? React.createElement('div', { className: 'info-text' }, 'No peers connected')
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
              key: 'connect-btn',
              disabled: status === 'connecting'
            },
              React.createElement('span', { className: 'material-icons', style: { verticalAlign: 'middle', marginRight: 8 } }, 'call'),
              'Connect'
            )
          ]
        : [
            React.createElement('div', { className: 'room-name', key: 'room-name', style: { marginBottom: 2, fontWeight: 'bold', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: 8 } },
              'Room: ',
              React.createElement('a', {
                href: `?room=${encodeURIComponent(room)}`,
                style: { color: '#8e44ad', textDecoration: 'underline', marginLeft: 6, marginRight: 6, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 },
                onClick: e => {
                  e.preventDefault();
                  const url = new URL(window.location.href);
                  url.searchParams.set('room', room);
                  navigator.clipboard.writeText(url.toString());
                },
                title: 'Copy room link to clipboard'
              },
                room || '(unnamed)',
                React.createElement('span', { className: 'material-icons', style: { fontSize: '1.1em', marginLeft: 4 } }, 'content_copy')
              )
            ),
            React.createElement('div', { className: 'info-text', style: { marginBottom: 20 } }, 'Copy link above to invite others'),
            React.createElement('button', {
              className: 'disconnect-btn',
              onClick: disconnect,
              key: 'disconnect-btn'
            },
              React.createElement('span', { className: 'material-icons', style: { verticalAlign: 'middle', marginRight: 8 } }, 'call_end'),
              'Disconnect'
            ),
            React.createElement('button', {
              className: `mic-btn${micEnabled ? '' : ' mic-off'}`,
              onClick: e => {
                toggleMic();
                if (e && e.target && typeof e.target.blur === 'function') e.target.blur();
              },
              key: 'mic-btn',
              title: micEnabled ? 'Microphone is ON' : 'Microphone is OFF'
            },
              React.createElement('span', { className: 'material-icons', style: { verticalAlign: 'middle', marginRight: 8 } }, micEnabled ? 'mic' : 'mic_off'),
              micEnabled ? 'Microphone is ON' : 'Microphone is OFF'
            ),
            !micEnabled && !prevSpaceKeyPressedRef.current ? React.createElement('div', { className: 'info-text' }, 'Press and hold SPACE to talk') : null
          ]
    )
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));

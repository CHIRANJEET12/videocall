import React from 'react'
import { useEffect, useState, useRef } from 'react'

export const User1 = () => {
    const socketRef = useRef<WebSocket | null>(null);
    const pcRef = useRef<RTCPeerConnection | null>(null);
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);



    //connection setup
    useEffect(() => {
        const socket = new WebSocket('ws://localhost:8080');
        socketRef.current = socket;

        const pc = new RTCPeerConnection();
        pcRef.current = pc;

        socket.onopen = () => {
            console.log('user1 connected');
            socket.send(JSON.stringify({
                type: 'user1'
            }))
        };

        pc.onicecandidate = (e) => {
            if (e.candidate) {
                socket.send(JSON.stringify({
                    type: 'icecandidate',
                    candidate: e.candidate
                }))
            }
        };

        socket.onmessage = (e) => {
            try {
                const msg = JSON.parse(e.data);
                if (msg.type === 'createAnswer') {
                    pc.setRemoteDescription(msg.sdp);
                } else if (msg.type === 'iceCandidate') {
                    pc.addIceCandidate(msg.candidate);
                }
            } catch (err) {
                console.warn('Non-JSON message received:', e.data);
            }
        };


pc.ontrack = (event) => {
  console.log('Received remote track:', event.track.kind); // Should log "video"
  if(videoRef.current){
    const stream = videoRef.current.srcObject as MediaStream || new MediaStream();
    stream.addTrack(event.track);
    videoRef.current.srcObject = stream;
    videoRef.current.play();
  }
};


    }, []);

    //video accessing and more
const startMedia = async () => {
  try {
    // First enumerate devices to check available cameras
    const devices = await navigator.mediaDevices.enumerateDevices();
    console.log('Video devices:', devices.filter(d => d.kind === 'videoinput'));

    // Try getting media with fallback options
    const constraints = {
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: true
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    streamRef.current = stream;

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }

    stream.getTracks().forEach(track => {
      pcRef.current?.addTrack(track, stream);
    });

    // Only create offer if this is User1
    if (socketRef.current?.url.includes('user1')) {
      const offer = await pcRef.current?.createOffer();
      await pcRef.current?.setLocalDescription(offer);
      socketRef.current?.send(JSON.stringify({
        type: 'createOffer',
        sdp: offer
      }));
    }
  } catch (err) {
    console.error('Media access error:', err);
    // alert(`Failed to access camera/microphone: ${err.message}`);
  }
};

    const toggleAudio = () => {
        const audioTrack = streamRef.current?.getAudioTracks()[0];
        if (audioTrack) {
            audioTrack.enabled = !audioTrack.enabled;
            console.log(audioTrack.enabled ? 'Audio unmuted' : 'Audio muted');
        }
    };

    const toggleVideo = () => {
        const videoTrack = streamRef.current?.getVideoTracks()[0];
        if (videoTrack) {
            videoTrack.enabled = !videoTrack.enabled;
            console.log(videoTrack.enabled ? 'Video enabled' : 'Video disabled');
        }
    };




    return (
        <div className="video-container">
            <div className="video-wrapper">
                <h3>Your Video</h3>
                <video
                    ref={localVideoRef}
                    autoPlay
                    muted
                    playsInline
                    width={300}
                />
            </div>
            <div className="video-wrapper">
                <h3>Remote Video</h3>
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    width={300}
                />
            </div>
            <div className="controls">
                <button onClick={startMedia}>Start Call</button>
                <button onClick={toggleAudio}>Toggle Audio</button>
                <button onClick={toggleVideo}>Toggle Video</button>
            </div>
        </div>
    );
}
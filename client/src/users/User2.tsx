import React, { useEffect, useRef } from 'react';

export const User2 = () => {
    const socketRef = useRef<WebSocket | null>(null);
    const pcRef = useRef<RTCPeerConnection | null>(null);
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    useEffect(() => {
        const socket = new WebSocket('ws://localhost:8080');
        socketRef.current = socket;

        const pc = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] // Add STUN server
        });
        pcRef.current = pc;

        // Connection handlers
        socket.onopen = () => {
            console.log('User2 connected');
            socket.send(JSON.stringify({ type: 'receiver' }));
        };

        // ICE Candidate handling
        pc.onicecandidate = (e) => {
            if (e.candidate) {
                console.log('Sending ICE candidate');
                socket.send(JSON.stringify({
                    type: 'iceCandidate', // Make consistent with User1
                    candidate: e.candidate
                }));
            }
        };

        // Message handling
        socket.onmessage = async (e) => {
            try {
                const msg = JSON.parse(e.data);
                console.log('Message received:', msg);

                if (msg.type === 'createOffer') {
                    await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
                    console.log('Remote description set');

                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);
                    console.log('Answer created');

                    socket.send(JSON.stringify({
                        type: 'createAnswer',
                        sdp: answer
                    }));
                } else if (msg.type === 'iceCandidate') { // Made consistent
                    console.log('Adding ICE candidate');
                    await pc.addIceCandidate(msg.candidate);
                }
            } catch (err) {
                console.error('Message error:', err);
            }
        };

        // Track handling - fixed to use remoteVideoRef
        pc.ontrack = (event) => {
            if (remoteVideoRef.current) {
                const remoteStream = new MediaStream();
                remoteStream.addTrack(event.track);
                remoteVideoRef.current.srcObject = remoteStream;
            }

        };


        startMedia();
    }, []);

    const startMedia = async () => {
        try {
            const constraints = {
                video: { width: { ideal: 1280 }, height: { ideal: 720 } },
                audio: true
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            streamRef.current = stream;

            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
            }

            // Add all tracks to peer connection
            stream.getTracks().forEach(track => {
                pcRef.current?.addTrack(track, stream);
            });

        } catch (err) {
            console.error('Media error:', err);
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
                    ref={remoteVideoRef}
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
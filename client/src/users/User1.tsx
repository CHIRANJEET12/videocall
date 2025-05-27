import React, { useEffect, useState, useRef } from 'react';

export const User1 = () => {
    const socketRef = useRef<WebSocket | null>(null);
    const pcRef = useRef<RTCPeerConnection | null>(null);
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    // const remoteVideoRef = useRef<MediaStream | null>(new MediaStream());

    useEffect(() => {
        const socket = new WebSocket('ws://localhost:8080');
        socketRef.current = socket;

        const pc = new RTCPeerConnection();
        pcRef.current = pc;

        socket.onopen = () => {
            console.log('User1 connected');
            socket.send(JSON.stringify({ type: 'sender' }));
        };

        pc.onicecandidate = (e) => {
            if (e.candidate) {
                socket.send(JSON.stringify({
                    type: 'iceCandidate',
                    candidate: e.candidate
                }));
            }
        };

        socket.onmessage = async (e) => {
            try {
                const msg = JSON.parse(e.data);
                if (msg.type === 'createAnswer') {
                    await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
                } else if (msg.type === 'iceCandidate') {
                    pc.addIceCandidate(msg.candidate);
                }
            } catch (err) {
                console.warn('Non-JSON message received:', e.data);
            }
        };
        pc.ontrack = (event) => {
            const video = remoteVideoRef.current;
            if (!video) return;

            // Ensure a MediaStream is assigned to the video element
            if (!video.srcObject) {
                video.srcObject = new MediaStream();
            }

            const stream = video.srcObject;
            if (stream instanceof MediaStream) {
                stream.addTrack(event.track);
                video.play().catch(err => {
                    console.warn('Auto-play was prevented:', err);
                });
            }
        };



        startMedia();

        // Cleanup on unmount
        return () => {
            socket.close();
            pc.close();
            streamRef.current?.getTracks().forEach(track => track.stop());
        };
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

            stream.getTracks().forEach(track => {
                pcRef.current?.addTrack(track, stream);
            });

            const offer = await pcRef.current?.createOffer();
            await pcRef.current?.setLocalDescription(offer);
            socketRef.current?.send(JSON.stringify({
                type: 'createOffer',
                sdp: offer
            }));

        } catch (err) {
            console.error('Media access error:', err);
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
};

const socket = io("https://test-video-call.onrender.com");

const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const joinBtn = document.getElementById("joinBtn");
const roomInput = document.getElementById("roomInput");

let localStream;
let peerConnection;
let roomId;

// const servers = {
//   iceServers: [
//     {
//       urls: "stun:stun.l.google.com:19302",
//     },
//   ],
// };

const servers = {
  iceServers: [
    {
      urls: "stun:stun.l.google.com:19302",
    },

    {
      urls: [
        "turn:free.expressturn.com:3478?transport=udp",
        "turn:free.expressturn.com:3478?transport=tcp",
      ],
      username: "000000002093867496",
      credential: "43JkbQvWN7aFkIK7vxhfVkwTqTQ=",
    },
  ],
};

async function initMedia() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    localVideo.srcObject = localStream;
  } catch (error) {
    console.error("Error accessing camera/microphone:", error);
    alert("Please allow camera and microphone permissions!");
  }
}

function createPeerConnection() {
  peerConnection = new RTCPeerConnection(servers);

  localStream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, localStream);
  });

  peerConnection.ontrack = (event) => {
    remoteVideo.srcObject = event.streams[0];
  };

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit("ice-candidate", {
        roomId,
        candidate: event.candidate,
      });
    }
  };
}

joinBtn.addEventListener("click", async () => {
  roomId = roomInput.value;

  if (!roomId) {
    return alert("Please enter a room ID");
  }

  await initMedia();
  socket.emit("join-room", roomId);
});

socket.on("user-joined", async () => {
  createPeerConnection();
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  socket.emit("offer", { roomId, offer });
});

socket.on("offer", async (offer) => {
  createPeerConnection();
  await peerConnection.setRemoteDescription(offer);
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  socket.emit("answer", { roomId, answer });
});

socket.on("answer", async (answer) => {
  await peerConnection.setRemoteDescription(answer);
});

socket.on("ice-candidate", async (candidate) => {
  try {
    await peerConnection.addIceCandidate(candidate);
  } catch (error) {
    console.error("Error adding ice candidate", error);
  }
});

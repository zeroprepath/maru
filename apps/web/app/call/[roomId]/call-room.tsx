"use client";
import { CallState } from "@/entities/call/model";
import { useCallStore } from "@/entities/call/model/store";
import {
  ClientToServer,
  PeerId,
  RoomId,
  ServerToClient,
} from "@maru/shared-types";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:3001/ws";
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
// relay 경로 검증용 — M1-06 한정. 경로별(all/relay) 분기는 ADR-013·M2-02가 완성한다.
const FORCE_RELAY = process.env.NEXT_PUBLIC_FORCE_RELAY === "true";

interface TurnCredentials {
  urls: string[];
  username: string;
  credential: string;
}

function assertNever(x: never): never {
  throw new Error(`처리하지 않은 이벤트: ${JSON.stringify(x)}`);
}

type GateState = "idle" | "requesting" | "denied" | "no-device";

// Tailwind Preflight가 버튼 기본 배경·테두리를 지우므로 명시적으로 준다.
// Design.md §15 --color-primary(라이트)/--color-primary-fg, --radius-full, --space-3/--space-6.
const primaryButtonStyle = {
  background: "#C93850",
  color: "#FFFFFF",
  border: "none",
  borderRadius: 999,
  padding: "12px 24px",
} as const;

const secondaryButtonStyle = {
  background: "transparent",
  color: "#C93850",
  border: "none",
  textDecoration: "underline",
} as const;

// export를 붙이지 않는다 — app/ 아래 "use client" 파일에서 컴포넌트를 export하면
// Next.js가 함수 타입 prop(onGranted)을 Server Action으로 오인해 경고를 낸다.
// (node_modules/next/dist/server/typescript/rules/client-boundary.js)
function PermissionGate({
  onGranted,
}: {
  onGranted: (stream: MediaStream) => void;
}) {
  const [state, setState] = useState<GateState>("idle");

  async function request() {
    setState("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      onGranted(stream);
    } catch (err) {
      if (err instanceof DOMException && err.name === "NotFoundError") {
        setState("no-device");
      } else {
        setState("denied");
      }
    }
  }

  if (state === "denied") {
    return (
      <main
        style={{ fontFamily: "sans-serif", padding: 16, textAlign: "center" }}
      >
        <p>카메라와 마이크를 허용해야{"\n"}통화할 수 있어요</p>
        <button style={secondaryButtonStyle}>허용하는 방법 보기</button>
        <button style={primaryButtonStyle} onClick={() => void request()}>
          다시 시도
        </button>
        <p>
          <a href="/home">← 홈으로</a>
        </p>
      </main>
    );
  }

  if (state === "no-device") {
    return (
      <main
        style={{ fontFamily: "sans-serif", padding: 16, textAlign: "center" }}
      >
        <p>연결된 카메라나 마이크를{"\n"}찾지 못했어요</p>
        <button style={primaryButtonStyle} onClick={() => void request()}>
          다시 시도
        </button>
      </main>
    );
  }

  return (
    <main
      style={{ fontFamily: "sans-serif", padding: 16, textAlign: "center" }}
    >
      <p>
        카메라와 마이크를 켤게요{"\n"}얼굴을 보고 목소리를 들어야 대화가
        되니까요
      </p>
      <button
        style={primaryButtonStyle}
        onClick={() => void request()}
        disabled={state === "requesting"}
      >
        허용하기
      </button>
      <p>허용해도 녹화하거나 저장하지 않아요</p>
    </main>
  );
}

export function CallRoom({ roomId }: { roomId: RoomId }) {
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    if (!stream) return;
    return () => {
      stream.getTracks().forEach((t) => t.stop());
    };
  }, [stream]);

  if (!stream) {
    return <PermissionGate onGranted={setStream} />;
  }

  return <ActiveCall roomId={roomId} stream={stream} />;
}

function ActiveCall({
  roomId,
  stream,
}: {
  roomId: RoomId;
  stream: MediaStream;
}) {
  const router = useRouter();
  const localVideo = useRef<HTMLVideoElement>(null);
  const remoteVideo = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState("입장 중...");
  const { state, dispatch } = useCallStore();
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const startedAtRef = useRef(0);
  const remotePeerIdRef = useRef<PeerId | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);

  function handleEnd() {
    stream.getTracks().forEach((t) => t.stop()); // 하드웨어 반납
    pcRef.current?.close();
    socketRef.current?.close();
    dispatch({ type: "LEAVE" });
    const duration = Math.round((Date.now() - startedAtRef.current) / 1000);
    router.push(`/call/${roomId}/ended?duration=${duration}`);
  }

  function toggleMic() {
    const track = stream.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMicOn(track.enabled);
  }

  function toggleCamera() {
    const track = stream.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setCameraOn(track.enabled);
  }

  useEffect(() => {
    let cancelled = false;

    async function start() {
      const res = await fetch(`${API_URL}/turn-credentials`);
      const turn = (await res.json()) as TurnCredentials;
      if (cancelled) {
        return;
      }

      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          {
            urls: turn.urls,
            username: turn.username,
            credential: turn.credential,
          },
        ],
        // relay 강제는 검증 전용(M1-06) — 프로덕션 경로 분기는 ADR-013·M2-02가 정한다.
        ...(FORCE_RELAY ? { iceTransportPolicy: "relay" as const } : {}),
      });

      const socket = new WebSocket(WS_URL);
      pcRef.current = pc;
      socketRef.current = socket;
      startedAtRef.current = Date.now();
      dispatch({ type: "JOIN", roomId });

      const send = (msg: ClientToServer) => socket.send(JSON.stringify(msg));

      pc.ontrack = (e) => {
        const [first] = e.streams;
        if (first && remoteVideo.current) {
          remoteVideo.current.srcObject = first;
          setStatus("연결됨");
        }
      };

      pc.onicecandidate = (e) => {
        if (!e.candidate || socket.readyState !== WebSocket.OPEN) {
          return;
        }

        send({
          type: "ice",
          roomId,
          candidate: {
            candidate: e.candidate.candidate,
            sdpMid: e.candidate.sdpMid,
            sdpMLineIndex: e.candidate.sdpMLineIndex,
          },
        });
      };

      pc.onconnectionstatechange = () => {
        switch (pc.connectionState) {
          case "connected":
            if (remotePeerIdRef.current) {
              dispatch({
                type: "PEER_CONNECTED",
                peerId: remotePeerIdRef.current,
              });
            }
            return;
          case "disconnected":
            dispatch({ type: "DISCONNECTED" });
            return;
          case "failed":
            dispatch({ type: "RETRY_FAILED", reason: "ice-failed" });
            return;
          default:
            return;
        }
      };

      async function makeOffer() {
        await pc.setLocalDescription(await pc.createOffer());
        send({ type: "offer", roomId, sdp: pc.localDescription?.sdp ?? "" });
      }

      async function onMessage(raw: string) {
        const msg = JSON.parse(raw) as ServerToClient;
        switch (msg.type) {
          case "room-joined":
            if (msg.peers.length === 0) {
              setStatus("상대를 기다리는 중...");
              return;
            }
            remotePeerIdRef.current = msg.peers[0] ?? null;
            setStatus("연결 중...");
            return makeOffer();
          case "peer-joined":
            remotePeerIdRef.current = msg.peerId;
            setStatus("상대가 들어왔습니다.");
            return;
          case "offer":
            remotePeerIdRef.current = msg.from;
            await pc.setRemoteDescription({ type: "offer", sdp: msg.sdp });
            await pc.setLocalDescription(await pc.createAnswer());
            send({
              type: "answer",
              roomId,
              sdp: pc.localDescription?.sdp ?? "",
            });
            return;
          case "answer":
            await pc.setRemoteDescription({ type: "answer", sdp: msg.sdp });
            return;
          case "ice":
            await pc.addIceCandidate(msg.candidate);
            return;
          case "peer-left":
            setStatus("상대가 나갔습니다.");
            if (remoteVideo.current) {
              remoteVideo.current.srcObject = null;
            }
            return;
          case "error":
            setStatus(`오류: ${msg.code}`);
            return;
          case "guest-waiting":
          case "rejected":
            return;
          default:
            return assertNever(msg);
        }
      }

      socket.onmessage = (e: MessageEvent<string>) => {
        onMessage(e.data);
      };

      if (localVideo.current) {
        localVideo.current.srcObject = stream;
      }

      for (const track of stream.getTracks()) {
        pc.addTrack(track, stream);
      }

      // 코덱은 기기 목록으로 분기하지 않고, 그 브라우저가 신고하는 capabilities 중
      // 하드웨어 가속되는 쪽(H.264)을 우선한다 — 없으면 자동으로 다음 순위로 폴백된다(ADR-022).
      const videoTransceiver = pc
        .getTransceivers()
        .find((t) => t.sender.track?.kind === "video");
      const videoCodecs = RTCRtpSender.getCapabilities("video")?.codecs ?? [];
      if (videoTransceiver && videoCodecs.length > 0) {
        const h264 = videoCodecs.filter((c) => c.mimeType === "video/H264");
        const rest = videoCodecs.filter((c) => c.mimeType !== "video/H264");
        videoTransceiver.setCodecPreferences([...h264, ...rest]);
      }

      const videoSender = pc.getSenders().find((s) => s.track?.kind === "video");
      if (videoSender) {
        const params = videoSender.getParameters();
        params.degradationPreference = "maintain-framerate";
        videoSender.setParameters(params).catch(() => {});
      }

      const join = () => send({ type: "join-room", roomId });
      if (socket.readyState === WebSocket.OPEN) {
        join();
      } else {
        socket.onopen = join;
      }
    }

    start();

    return () => {
      cancelled = true;
      socketRef.current?.close();
      pcRef.current?.close();
    };
  }, [roomId, stream]);

  function describeConnection(status: CallState["status"]): string {
    switch (status) {
      case "connecting":
        return "연결하고 있어요"; // call.status.connecting
      case "connected":
        return "연결됐어요"; // call.status.connected
      case "reconnecting":
        return "연결이 불안정해요. 다시 연결 중이에요"; // call.status.reconnecting
      case "failed":
        return "연결에 실패했어요"; // call.status.failed
      case "ended":
        return "통화가 끝났어요"; // call.status.ended
      default:
        return "상대를 기다리는 중…";
    }
  }

  return (
    <main
      style={{
        position: "relative",
        height: "100dvh",
        background: "#14111F", // --color-bg(다크) — 통화 화면은 다크가 기본(12.4)
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 1120,
          aspectRatio: "16 / 9",
        }}
      >
        <video
          ref={remoteVideo}
          autoPlay
          playsInline
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            borderRadius: 12,
          }}
        />
        <video
          ref={localVideo}
          autoPlay
          playsInline
          muted
          style={{
            position: "absolute",
            right: 16,
            bottom: 16,
            width: 160,
            height: 213,
            objectFit: "cover",
            borderRadius: 12,
            boxShadow: "0 4px 16px rgba(28,24,48,0.16)",
          }}
        />
      </div>
      <div
        style={{
          position: "fixed",
          top: 16,
          left: 16,
          color: "#FFFFFF",
          fontSize: 14,
        }}
      >
        {status} · {describeConnection(state.status)}
      </div>
      <div style={{ position: "fixed", top: 16, right: 16 }}>
        <button
          disabled
          style={{ color: "#FFFFFF", opacity: 0.4 }}
          aria-label="신고 (준비 중)"
        >
          ⚑ 신고
        </button>
      </div>
      <div
        style={{
          position: "fixed",
          bottom: 32,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          gap: 12,
          padding: "12px 24px",
          borderRadius: 999,
          background: "rgba(28,24,48,0.6)",
          backdropFilter: "blur(12px)",
          boxShadow: "0 4px 16px rgba(28,24,48,0.16)",
        }}
      >
        <button style={{ color: "#FFFFFF" }} onClick={toggleMic}>
          {micOn ? "🎤 마이크" : "🔇 마이크"}
        </button>
        <button style={{ color: "#FFFFFF" }} onClick={toggleCamera}>
          {cameraOn ? "📷 카메라" : "🚫 카메라"}
        </button>
        <button
          onClick={handleEnd}
          style={{ background: "#C93245", color: "#FFFFFF" }}
        >
          {/* #C93245 — Design.md §15 --color-danger(라이트). @theme 배선되면 var(--color-danger)로 바뀔 자리 */}
          ⏺ 통화 종료
        </button>
      </div>
    </main>
  );
}

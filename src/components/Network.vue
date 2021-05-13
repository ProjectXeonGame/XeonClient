<template>
  <div id="network_empty"></div>
</template>
<script lang="ts">
import { defineComponent, inject, onMounted } from "vue";

export default defineComponent({
  emits: ["message", "open", "error", "close"],
  setup(props, { emit }) {
    const websocket_uri = inject("websocket_uri") as string;
    let socket = new WebSocket(websocket_uri);
    onMounted(() => {
      socket.addEventListener(
        "message",
        (ev: MessageEvent<string | Uint8Array>) => {
          emit("message", ev.data);
        }
      );
      socket.addEventListener("error", () => {
        emit("error", new Error("A WebSocket Error Occurred."));
      });
      socket.addEventListener("open", () => {
        emit("open");
      });
      socket.addEventListener("close", (ev) => {
        emit("close", ev.code, ev.reason);
      });
    });
    return {
      socket,
    };
  },
  methods: {
    ensureClose(): boolean {
      return this.socket.readyState != WebSocket.OPEN;
    },
    send(message: string | Uint8Array) {
      if (this.ensureClose()) return;
      this.socket.send(message);
    },
    sendEvent(event: string, data: { [key: string]: any }) {
      data.event = event.toUpperCase();
      this.send(JSON.stringify(data));
    },
  },
});
</script>
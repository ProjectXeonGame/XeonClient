<template>
    <div id="network_empty"></div>
</template>
<script lang="ts">
    import { Options, Vue } from "vue-class-component";

    @Options({
        data() {
            return {
                socket: new WebSocket(this.websocket_uri),
            }
        },
        mounted() {
            this.socket.onmessage = (ev: MessageEvent) => {
                this.$emit("message", ev.data);
            }
            this.socket.onerror = (ev: ErrorEvent) => {
                this.$emit("error", ev.error);
            }
            this.socket.onopen = () => {
                this.$emit("open");
            }
            this.socket.onclose = (ev: CloseEvent) => {
                this.$emit("close", ev.code, ev.reason);
            }
        },
        emits: ["message", "open", "error", "close"],
        methods: {
            ensureClose(): boolean {
                return this.socket.readyState != WebSocket.OPEN;
            },
            send(message: string | Uint8Array) {
                if (this.ensureClose()) return;
                this.socket.send(message);
            },
            sendEvent(data: {[key: string]: any; }) {
                if (this.ensureClose()) return;
                this.send(JSON.stringify(data));
            }
        },
        inject: {
            websocket_uri: {
                from: "websocket_uri",
            }
        }
    })
    export default class Network extends Vue {
    }
</script>
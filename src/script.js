      const btn = document.getElementById("join");

      // Get the current URL
      const url = window.location.href;

      // Create a new URLSearchParams object to parse the query string
      const params = new URLSearchParams(window.location.search);
      let data_token;
      // Get the values of specific parameters
      const query = params.get("token");
      fetch(
        "https://robloxapi-wzzv.onrender.com/api/gettoken?token=" +
          encodeURIComponent(query),
      )
        .then((res) => {
          if (!res.ok) throw new Error("Błąd: " + res.status);
          return res.json();
        })
        .then((data) => {
          data_token = data;
          document.getElementById("text_username").textContent =
            data.username || "Unknown User";
        })
        .catch((err) => {
          console.error("Błąd przy pobieraniu tokena:", err);
          document.getElementById("text_username").textContent =
            "Błąd ładowania użytkownika";
        });

      btn.onclick = async () => {
        const ws = new WebSocket(
          "wss://robloxapi-wzzv.onrender.com:4000",
        );
        ws.binaryType = "arraybuffer";
        ws.onopen = () => {
          document.getElementById("join").style.display = "none";
          document.getElementById("text").style.display = "block";
          ws.send(
            JSON.stringify({
              cmd: "set",
              room: data_token.gameid + data_token.server,
              token: query,
            }),
          );
          ws.send(JSON.stringify({ cmd: "players_count" }));
          setInterval(() => {
            ws.send(JSON.stringify({ cmd: "players_count" }));
          }, 1000);
        };
        console.log(data_token.gameid + data_token.server);
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        const context = new AudioContext();
        const source = context.createMediaStreamSource(stream);
        const processor = context.createScriptProcessor(2048, 1, 1);

        source.connect(processor);
        processor.connect(context.destination);

        processor.onaudioprocess = (e) => {
          const input = e.inputBuffer.getChannelData(0);
          const buffer = new ArrayBuffer(input.length * 2);
          const view = new DataView(buffer);
          for (let i = 0; i < input.length; i++) {
            view.setInt16(i * 2, input[i] * 32767, true);
          }
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(buffer);
          }
        };

        // Odtwarzanie audio od innych
        const speaker = context.createScriptProcessor(2048, 1, 1);
        speaker.connect(context.destination);

        let audioQueue = [];

        ws.onmessage = (msg) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.cmd === "players_count") {
              document.getElementById("text").textContent =
                "Players: " + msg.val;
            }
          } catch (e) {
            console.error("Invalid message format:", event.data);
          }
          audioQueue.push(new Int16Array(msg.data));
        };

        speaker.onaudioprocess = (e) => {
          const output = e.outputBuffer.getChannelData(0);
          if (audioQueue.length > 0) {
            const buffer = audioQueue.shift();
            for (let i = 0; i < buffer.length; i++) {
              output[i] = buffer[i] / 32767;
            }
          } else {
            output.fill(0);
          }
        };
      };

/* Fragmentos de código que muestra la sección "Conectar por MQTT", ya resaltados y armados para el nodo elegido. */
(() => {
  "use strict";
  const { esc, fmt } = SmartCampus.util;

  const json = ({ cfg, actual, ts, mainVal, datos }) => `{
  <span class="s">"nodo"</span>: <span class="s">"${actual}-01"</span>,
  <span class="s">"ts"</span>: <span class="s">"${ts}"</span>,
  <span class="s">"temp"</span>: <span class="n">${fmt(datos.temp[23], 1).replace(",", ".")}</span>,
  <span class="s">"hum"</span>: <span class="n">${Math.round(datos.hum[23])}</span>,
  <span class="s">"${cfg.clave}"</span>: <span class="n">${mainVal}</span>,
  <span class="s">"rssi"</span>: <span class="n">-58</span>
}`;

  const arduino = ({ cfg, actual, topic }) => `<span class="c">// Librerías: PubSubClient y ArduinoJson</span>
<span class="k">const char</span>* TOPIC = <span class="s">"${topic}"</span>;

<span class="k">void</span> publicar() {
  StaticJsonDocument&lt;<span class="n">256</span>&gt; doc;
  doc[<span class="s">"nodo"</span>] = <span class="s">"${actual}-01"</span>;
  doc[<span class="s">"temp"</span>] = dht.readTemperature();
  doc[<span class="s">"hum"</span>]  = dht.readHumidity();
  doc[<span class="s">"${cfg.clave}"</span>] = leer${actual.charAt(0).toUpperCase() + actual.slice(1)}(); <span class="c">// función de tu sensor (${esc(cfg.sensor)})</span>
  doc[<span class="s">"rssi"</span>] = WiFi.RSSI();

  <span class="k">char</span> buf[<span class="n">256</span>];
  serializeJson(doc, buf);
  <span class="k">if</span> (!mqtt.connected()) reconectar();  <span class="c">// reconexión automática</span>
  mqtt.publish(TOPIC, buf);
}`;

  const web = ({ cfg, actual, topic }) => `<span class="c">// &lt;script src="https://unpkg.com/mqtt@5.10.1/dist/mqtt.min.js"&gt;&lt;/script&gt;</span>
<span class="k">const</span> client = mqtt.connect(<span class="s">"ws://IP-DEL-SERVIDOR:9001"</span>, {
  username: <span class="s">"dashboard"</span>, password: <span class="s">"********"</span>
});
<span class="k">let</span> ultimoDato = Date.now();

client.on(<span class="s">"connect"</span>, () =&gt; client.subscribe(<span class="s">"${topic}"</span>));
client.on(<span class="s">"message"</span>, (topic, msg) =&gt; {
  <span class="k">try</span> {
    <span class="k">const</span> d = JSON.parse(msg.toString());
    ultimoDato = Date.now();
    pintarTarjeta(<span class="s">"temp"</span>, d.temp, <span class="s">"°C"</span>);
    pintarTarjeta(<span class="s">"hum"</span>, d.hum, <span class="s">"%"</span>);
    pintarTarjeta(<span class="s">"${actual}"</span>, d.${cfg.clave}, <span class="s">"${cfg.unidad}"</span>);
  } <span class="k">catch</span> (e) { console.warn(<span class="s">"Mensaje inválido"</span>, e); }
});

<span class="c">// Estado del nodo: más de 5 min sin datos = desconectado</span>
setInterval(() =&gt; {
  <span class="k">const</span> min = (Date.now() - ultimoDato) / <span class="n">60000</span>;
  marcarEstado(min &lt; <span class="n">2</span> ? <span class="s">"ok"</span> : min &lt; <span class="n">5</span> ? <span class="s">"warn"</span> : <span class="s">"offline"</span>);
}, <span class="n">10000</span>);`;

  const mosquitto = () => `<span class="c"># MQTT clásico para los ESP32</span>
listener <span class="n">1883</span>
<span class="c"># WebSockets para el dashboard en el navegador</span>
listener <span class="n">9001</span>
protocol websockets
<span class="c"># Sin usuarios anónimos (Seguridad Informática)</span>
allow_anonymous <span class="k">false</span>
password_file /etc/mosquitto/passwd`;

  SmartCampus.guia.codigo = { json, arduino, web, mosquitto };
})();

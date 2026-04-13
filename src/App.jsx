import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from "recharts";

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

class Rotor {
  constructor(wiring, notch) {
    this.wiring = wiring;
    this.position = 0;
    this.notch = notch;
  }
  setPosition(p) { this.position = p; }
  forward(c) {
    const index = (alphabet.indexOf(c) + this.position) % 26;
    return this.wiring[index];
  }
  backward(c) {
    const index = this.wiring.indexOf(c);
    return alphabet[(index - this.position + 26) % 26];
  }
  rotate() {
    this.position = (this.position + 1) % 26;
    return this.position === this.notch;
  }
}

class Reflector {
  constructor(wiring) { this.wiring = wiring; }
  reflect(c) { return this.wiring[alphabet.indexOf(c)]; }
}

class Plugboard {
  constructor(pairs=[]) {
    this.map = {};
    pairs.forEach(([a,b])=>{ this.map[a]=b; this.map[b]=a; });
  }
  swap(c) { return this.map[c] || c; }
}

const ROTORS = {
  I: ["EKMFLGDQVZNTOWYHXUSPAIBRCJ", 16],
  II: ["AJDKSIRUXBLHWTMCQGZNPYFVOE", 4],
  III: ["BDFHJLCPRTXVZNYEIWGAKMUSQO", 21],
  IV: ["ESOVPZJAYQUIRHXLNFTGKDCMWB", 9],
  V: ["VZBRGITYUPSDNHLXAWMJQOFECK", 25],
  BETA: ["LEYJVCNIXWPBQMDRTAKZGFUHOS", -1],
  GAMMA: ["FSOKANUERHMBTIYCWLQPZXVGJD", -1] // 👈 agregado
};

const REFLECTORS = {
  "UKW B thin": "ENKQAUYWJICOPBLMDXZVFTHRGS",
  "UKW C thin": "RDOBJNTKVEHMLFCWZAXGYIPSUQ" // 👈 agregado
};

function buildMachine(cfg) {
  const r1 = new Rotor(...ROTORS[cfg.r1]);
  const r2 = new Rotor(...ROTORS[cfg.r2]);
  const r3 = new Rotor(...ROTORS[cfg.r3]);
  const r4 = new Rotor(...ROTORS[cfg.r4]);

  r1.setPosition(cfg.p1);
  r2.setPosition(cfg.p2);
  r3.setPosition(cfg.p3);
  r4.setPosition(cfg.p4);

  const reflector = new Reflector(REFLECTORS[cfg.ref]);
  const plugboard = new Plugboard(cfg.plug);

  return { r1, r2, r3, r4, reflector, plugboard };
}

function encryptWith(machine, text) {
  const { r1, r2, r3, r4, reflector, plugboard } = machine;
  let out = "";

  for (let c of text) {
    if (!alphabet.includes(c)) continue;

    c = plugboard.swap(c);
    c = r4.forward(c);
    c = r3.forward(c);
    c = r2.forward(c);
    c = r1.forward(c);

    c = reflector.reflect(c);

    c = r1.backward(c);
    c = r2.backward(c);
    c = r3.backward(c);
    c = r4.backward(c);
    c = plugboard.swap(c);

    if (r1.rotate()) if (r2.rotate()) if (r3.rotate()) r4.rotate();

    out += c;
  }
  return out;
}

function boxplot(values) {
  values.sort((a,b)=>a-b);
  return {
    min: values[0],
    q1: values[Math.floor(values.length*0.25)],
    median: values[Math.floor(values.length*0.5)],
    q3: values[Math.floor(values.length*0.75)],
    max: values[values.length-1]
  };
}

export default function App(){
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [mode, setMode] = useState("normal");
  const [data, setData] = useState([]);
  const [box, setBox] = useState(null);

  const [cfg, setCfg] = useState({
    ref: "UKW B thin",
    r1: "I", r2: "II", r3: "III", r4: "BETA",
    p1: 0, p2: 0, p3: 0, p4: 0,
    plug: [["A","B"],["C","D"]]
  });

  // 🔥 lógica automática rotor 4 → reflector
  useEffect(() => {
    if (cfg.r4 === "BETA") {
      setCfg(prev => ({ ...prev, ref: "UKW B thin" }));
    }
    if (cfg.r4 === "GAMMA") {
      setCfg(prev => ({ ...prev, ref: "UKW C thin" }));
    }
  }, [cfg.r4]);

  const handleEncrypt = () => {
    const m = buildMachine(cfg);
    setOutput(encryptWith(m, input.toUpperCase()));
  };

  const runSimulation = () => {
    let counts = {};
    for(let i=0;i<200000;i++){
      const m = buildMachine(cfg);
      const char = alphabet[Math.floor(Math.random()*26)];
      const enc = encryptWith(m, char);
      counts[enc] = (counts[enc]||0)+1;
    }

    const chart = Object.keys(counts).map(k=>({letter:k, value:counts[k]}));
    const values = Object.values(counts);

    setData(chart);
    setBox(boxplot(values));
    setMode("sim");
  };

  return (
    <div style={{padding:20, background:"#111", color:"white", minHeight:"100vh"}}>
      <h1>Enigma M4</h1>

      {mode === "normal" && (
        <>
          <div style={{
            background:"#1b1b1b",
            padding:20,
            borderRadius:10,
            maxWidth:500,
            margin:"0 auto 20px auto"
          }}>

            <div style={{marginBottom:10}}>
              Reflector:
              <select style={{marginLeft:10}} value={cfg.ref} disabled>
                {Object.keys(REFLECTORS).map(r=> <option key={r}>{r}</option>)}
              </select>
            </div>

            {["r1","r2","r3","r4"].map((r,i)=>(
              <div key={r} style={{marginBottom:10}}>
                Rotor {i+1}:

                <select
                  style={{margin:"0 10px"}}
                  value={cfg[r]}
                  onChange={e=>setCfg({...cfg,[r]:e.target.value})}
                >
                  {i === 3
                    ? ["BETA","GAMMA"].map(ro => <option key={ro}>{ro}</option>)
                    : Object.keys(ROTORS)
                        .filter(ro => ro !== "BETA" && ro !== "GAMMA")
                        .map(ro => <option key={ro}>{ro}</option>)
                  }
                </select>

                Pos:
                <input
                  style={{width:50, marginLeft:5}}
                  type="number"
                  min="0"
                  max="25"
                  value={cfg[`p${i+1}`]}
                  onChange={e=>setCfg({...cfg,[`p${i+1}`]:Number(e.target.value)})}
                />
              </div>
            ))}
          </div>

          <input
            value={input}
            onChange={e=>setInput(e.target.value)}
            placeholder="Texto"
            style={{padding:10, width:500, display:"block", margin:"0 auto"}}
          />

          <div style={{marginTop:10, textAlign:"center"}}>
            <button style={{background:"#4FC3F7",padding:10,cursor:"pointer"}} onClick={handleEncrypt}>Cifrar</button>
            <button style={{background:"#4FC3F7",padding:10,marginLeft:10,cursor:"pointer"}} onClick={runSimulation}>Simulación</button>
          </div>

          <p style={{textAlign:"center"}}>Resultado: {output}</p>
        </>
      )}

       {mode === "sim" && (
        <>
          <div style={{display:"flex", justifyContent:"center", gap:40}}>

            {/* GRAFICOS */}
            <div>
              <h2>Histograma</h2>
              <BarChart width={500} height={250} data={data}>
                <XAxis dataKey="letter"/>
                <YAxis/>
                <Tooltip />
                <Bar dataKey="value" fill="#4FC3F7" />
              </BarChart>

              <h2 style={{marginTop:20}}>Gráfico de Torta</h2>
              <PieChart width={400} height={300}>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="letter"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name }) => name}
                >
                  {data.map((entry, index) => (
                    <Cell key={index}
                      fill={`hsl(${(index * 360) / data.length}, 70%, 50%)`}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => {
                    const total = data.reduce((acc, d) => acc + d.value, 0);
                    return `${((value/total)*100).toFixed(2)}%`;
                  }}
                />
              </PieChart>
            </div>

            {/* TABLA */}
            <div>
              <h2>Frecuencias</h2>
              <table style={{
                borderCollapse:"collapse",
                background:"#1b1b1b",
                padding:10
              }}>
                <thead>
                  <tr>
                    <th style={th}>Letra</th>
                    <th style={th}>Cantidad</th>
                    <th style={th}>%</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((d,i)=>{
                    const total = data.reduce((acc, v)=>acc+v.value,0);
                    const percent = ((d.value/total)*100).toFixed(2);
                    return (
                      <tr key={i}>
                        <td style={td}>{d.letter}</td>
                        <td style={td}>{d.value}</td>
                        <td style={td}>{percent}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {box && (
            <div style={{marginTop:20}}>
              <h2>Diagrama de Caja y Bigotes</h2>

              <svg width={600} height={140}>
                <line x1={50} x2={550} y1={60} y2={60} stroke="white" />
                <line x1={50} x2={50} y1={40} y2={80} stroke="white" />
                <line x1={550} x2={550} y1={40} y2={80} stroke="white" />
                <rect x={150} y={40} width={300} height={40} fill="#4FC3F7" opacity={0.6} />
                <line x1={300} x2={300} y1={40} y2={80} stroke="red" strokeWidth={2} />

                <text x={40} y={100} fill="white">Min</text>
                <text x={140} y={100} fill="white">Q1</text>
                <text x={285} y={100} fill="white">Med</text>
                <text x={440} y={100} fill="white">Q3</text>
                <text x={540} y={100} fill="white">Max</text>

                <text x={30} y={120} fill="#4FC3F7">{box.min}</text>
                <text x={140} y={120} fill="#4FC3F7">{box.q1}</text>
                <text x={285} y={120} fill="#4FC3F7">{box.median}</text>
                <text x={440} y={120} fill="#4FC3F7">{box.q3}</text>
                <text x={540} y={120} fill="#4FC3F7">{box.max}</text>
              </svg>
            </div>
          )}

          <button style={{background:"#4FC3F7",padding:10,marginTop:20,cursor:"pointer"}} onClick={()=>setMode("normal")}>Volver</button>
        </>
      )}

    </div>
  );
}
const th = {border:"1px solid #555", padding:"6px"};
const td = {border:"1px solid #555", padding:"6px", textAlign:"center"};
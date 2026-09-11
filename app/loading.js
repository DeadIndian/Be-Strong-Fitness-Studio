"use client";
// Gym loading overlay — shown while three.js/WebGL compiles.
// SVG deadlift with SMIL <animate> on raw joint coordinates.
// Floor y=138. Keyframes: setup → pull → lockout → hold → lower → reset

const D="2.6s",
KT="0; 0.25; 0.5; 0.68; 0.82; 1",
KS="0.42 0 0.58 1; ".repeat(5).trimEnd().slice(0,-1);

function A({n,v}){
  return <animate attributeName={n} values={v} keyTimes={KT} dur={D}
    repeatCount="indefinite" calcMode="spline" keySplines={KS}/>;
}

// Joint value strings: "setup; pull; lockout; hold; lower; reset"
const HX="80;80;80;80;80;80", HY="108;102;96;96;101;108";
const NX="96;90;80;80;84;96", NY="86;79;62;62;72;86";
const HDX="101;93;80;80;86;101", HDY="78;71;53;53;63;78";
const SLX="90;85;73;73;78;90", SLY="92;86;70;70;79;92";
const SRX="100;94;87;87;91;100", SRY="92;86;70;70;79;92";
const ELX="70;64;57;57;63;70", ELY="112;103;84;84;96;112";
const ERX="104;102;103;103;102;104", ERY="112;103;84;84;96;112";
const BY="126;110;94;94;108;126";
const HLX="42;42;41;41;42;42", HRX="118;118;119;119;118;118";
const BLX="30;30;29;29;30;30", BRX="130;130;131;131;130;130";
const KLX="74;75;77;77;75;74", KLY="128;122;116;116;121;128";
const KRX="86;85;83;83;85;86", KRY="128;122;116;116;121;128";
const ALX="68;68;70;70;69;68", ARX="92;92;90;90;91;92";
const FY="138;138;138;138;138;138";
const TLX="55;55;57;57;56;55", TRX="105;105;103;103;104;105";
const PLY="112;96;80;80;94;112";

function L({x1,y1,x2,y2,s,w}){
  return (
    <line stroke={s} strokeWidth={w} strokeLinecap="round">
      <A n="x1" v={x1}/><A n="y1" v={y1}/>
      <A n="x2" v={x2}/><A n="y2" v={y2}/>
    </line>
  );
}

export default function Loading(){
  return (
    <div style={{position:"fixed",inset:0,zIndex:9999,display:"flex",
      flexDirection:"column",alignItems:"center",justifyContent:"center",
      background:"#0b0b0b"}}>
      <style>{`
        @keyframes pp{0%,42%,100%{filter:none}50%,65%{filter:drop-shadow(0 0 6px #00b3a4)}}
        @keyframes db{0%,80%,100%{opacity:.2;transform:scale(.8)}40%{opacity:1;transform:scale(1.2)}}
        .lp{animation:pp 2.6s ease-in-out infinite}
        .lb{display:inline-block;width:6px;height:6px;border-radius:50%;
            background:#00b3a4;animation:db 1.4s ease-in-out infinite both}
        .lb:nth-child(2){animation-delay:.18s}.lb:nth-child(3){animation-delay:.36s}
        @media(prefers-reduced-motion:reduce){.lp,.lb{animation:none!important}}
      `}</style>
      <svg viewBox="0 0 160 170" width="200" height="200"
        role="img" aria-label="Loading: barbell lift">
        <line x1="8" y1="140" x2="152" y2="140" stroke="#2a2a2a" strokeWidth="1.5"/>
        {/* plates */}
        {[["20;20;19;19;20;20","130;130;131;131;130;130"]].flatMap(([lx,rx])=>[
          <rect key="l" className="lp" width="10" height="28" rx="3" fill="#00b3a4">
            <A n="x" v={lx}/><A n="y" v={PLY}/>
          </rect>,
          <rect key="r" className="lp" width="10" height="28" rx="3" fill="#00b3a4">
            <A n="x" v={rx}/><A n="y" v={PLY}/>
          </rect>
        ])}
        {/* collars */}
        <rect width="6" height="20" rx="2" fill="#007a73">
          <A n="x" v="30;30;29;29;30;30"/><A n="y" v="116;100;84;84;98;116"/>
        </rect>
        <rect width="6" height="20" rx="2" fill="#007a73">
          <A n="x" v="124;124;125;125;124;124"/><A n="y" v="116;100;84;84;98;116"/>
        </rect>
        {/* bar */}
        <L x1={BLX} y1={BY} x2={BRX} y2={BY} s="#555" w="5"/>
        {/* left leg */}
        <L x1={HX} y1={HY} x2={KLX} y2={KLY} s="#2e7d32" w="7"/>
        <L x1={KLX} y1={KLY} x2={ALX} y2={FY} s="#2e7d32" w="6"/>
        <L x1={ALX} y1={FY} x2={TLX} y2={FY} s="#c8845a" w="5"/>
        {/* right leg */}
        <L x1={HX} y1={HY} x2={KRX} y2={KRY} s="#388e3c" w="6.5"/>
        <L x1={KRX} y1={KRY} x2={ARX} y2={FY} s="#388e3c" w="5.5"/>
        <L x1={ARX} y1={FY} x2={TRX} y2={FY} s="#b5784f" w="5"/>
        {/* spine */}
        <L x1={HX} y1={HY} x2={NX} y2={NY} s="#e8e8e8" w="8"/>
        {/* left arm */}
        <L x1={SLX} y1={SLY} x2={ELX} y2={ELY} s="#e0e0e0" w="5.5"/>
        <L x1={ELX} y1={ELY} x2={HLX} y2={BY} s="#c8845a" w="4.5"/>
        {/* right arm */}
        <L x1={SRX} y1={SRY} x2={ERX} y2={ERY} s="#e0e0e0" w="5.5"/>
        <L x1={ERX} y1={ERY} x2={HRX} y2={BY} s="#c8845a" w="4.5"/>
        {/* head */}
        <circle r="11" fill="#c8845a"><A n="cx" v={HDX}/><A n="cy" v={HDY}/></circle>
      </svg>
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",
        gap:"0.5rem",marginTop:"1rem"}}>
        <span style={{fontFamily:"ui-sans-serif,system-ui,sans-serif",fontSize:".65rem",
          fontWeight:800,letterSpacing:".26em",textTransform:"uppercase",color:"#00b3a4"}}>
          Loading
        </span>
        <span style={{display:"flex",gap:"5px"}}>
          <span className="lb"/><span className="lb"/><span className="lb"/>
        </span>
      </div>
    </div>
  );
}

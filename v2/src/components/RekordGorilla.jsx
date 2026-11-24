// A local vector animation, with the real GarasjeGym logo on the singlet.
// No external GIF requests, no artificial strobe effects, no separate mascot brand.
export default function RekordGorilla(){
 const logo=import.meta.env.BASE_URL+'garasjegym-49-512.png'
 return <svg className="gg-rekord-gorilla" viewBox="0 0 340 238" role="img" aria-label="GarasjeGym-gorillaen jublar med begge armane i vêret og den originale 49 GarasjeGym-logoen på singleten">
  <defs>
   <linearGradient id="gg-rekord-fur" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#545153"/><stop offset=".48" stopColor="#242628"/><stop offset="1" stopColor="#0d1013"/></linearGradient>
   <linearGradient id="gg-rekord-gold" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#ffdc83"/><stop offset=".5" stopColor="#ff9f22"/><stop offset="1" stopColor="#a65b13"/></linearGradient>
   <radialGradient id="gg-rekord-halo"><stop stopColor="#ff9f22" stopOpacity=".34"/><stop offset="1" stopColor="#ff9f22" stopOpacity="0"/></radialGradient>
   <clipPath id="gg-rekord-head"><path d="M125 122 Q132 86 151 69 L146 54 Q161 49 176 32 L200 40 Q217 21 254 32 Q297 27 316 59 L330 98 Q358 106 361 143 Q384 173 360 193 L371 225 Q347 272 307 287 L255 304 L204 290 Q149 271 137 227 L139 196 Q117 179 135 154Z"/></clipPath>
  </defs>
  <ellipse cx="170" cy="125" rx="163" ry="115" fill="url(#gg-rekord-halo)"/>
  <g className="gg-rekord-confetti" fill="#ffc258" opacity=".9" aria-hidden="true">
   <path d="m19 72 9-4 5 12-9 4zM63 13l8 4-5 10-8-4zM282 19l10-4 5 12-10 4zM310 94l9 3-4 12-9-3zM28 156l9 4-4 9-9-4zM309 158l10-4 4 10-10 4z"/>
  </g>
  <g className="gg-rekord-body">
   <path d="M115 116 Q99 111 87 136 Q80 158 97 185 L106 233 H234 L243 185 Q260 158 253 136 Q241 111 225 116Z" fill="url(#gg-rekord-fur)" stroke="#c8852d" strokeWidth="2"/>
   <g className="gg-rekord-arm gg-rekord-arm-left">
    <path d="M113 138 Q101 111 77 115 Q57 119 57 141 Q40 126 39 96 L51 75 Q56 63 44 49 Q27 38 15 53 L11 75 Q13 103 19 126 Q23 154 48 180 Q70 204 92 186 L115 164Z" fill="url(#gg-rekord-fur)" stroke="#c8852d" strokeWidth="2.2" strokeLinejoin="round"/>
    <path d="M20 76 Q8 62 18 48 Q22 39 32 41 Q41 36 46 44 Q57 43 61 54 Q68 66 56 82 L48 91 Q34 97 23 88Z" fill="#5b5351" stroke="#15171b" strokeWidth="3"/>
    <path d="M22 57l10 13m1-17 10 13m3-13 8 9" stroke="#211c1c" strokeWidth="2" strokeLinecap="round"/>
    <path d="M18 88 46 83 49 96 21 102Z" fill="url(#gg-rekord-gold)" stroke="#15171b" strokeWidth="2"/>
    <path d="M59 149 Q67 127 83 133 Q99 141 95 158 Q85 176 70 170M38 112Q37 133 49 150" fill="none" stroke="#75706b" strokeOpacity=".6" strokeWidth="3" strokeLinecap="round"/>
   </g>
   <g transform="translate(340 0) scale(-1 1)"><g className="gg-rekord-arm gg-rekord-arm-left">
    <path d="M113 138 Q101 111 77 115 Q57 119 57 141 Q40 126 39 96 L51 75 Q56 63 44 49 Q27 38 15 53 L11 75 Q13 103 19 126 Q23 154 48 180 Q70 204 92 186 L115 164Z" fill="url(#gg-rekord-fur)" stroke="#c8852d" strokeWidth="2.2" strokeLinejoin="round"/>
    <path d="M20 76 Q8 62 18 48 Q22 39 32 41 Q41 36 46 44 Q57 43 61 54 Q68 66 56 82 L48 91 Q34 97 23 88Z" fill="#5b5351" stroke="#15171b" strokeWidth="3"/>
    <path d="M22 57l10 13m1-17 10 13m3-13 8 9" stroke="#211c1c" strokeWidth="2" strokeLinecap="round"/>
    <path d="M18 88 46 83 49 96 21 102Z" fill="url(#gg-rekord-gold)" stroke="#15171b" strokeWidth="2"/>
    <path d="M59 149 Q67 127 83 133 Q99 141 95 158 Q85 176 70 170M38 112Q37 133 49 150" fill="none" stroke="#75706b" strokeOpacity=".6" strokeWidth="3" strokeLinecap="round"/>
   </g></g>
   <path d="M112 118 133 111 Q139 141 170 141 Q201 141 207 111 L228 118 Q219 158 239 188 L230 233 H110 L101 188 Q121 158 112 118Z" fill="#101318" stroke="#f6ab3c" strokeWidth="3.5" strokeLinejoin="round"/>
   <path d="M113 227 Q170 239 227 227" fill="none" stroke="#6d491e" strokeWidth="2"/>
   <image href={logo} x="130" y="149" width="80" height="80"/>
   <g className="gg-rekord-head"><svg x="95" y="2" width="150" height="147" viewBox="116 20 270 293"><image href={logo} width="512" height="512" clipPath="url(#gg-rekord-head)"/></svg></g>
  </g>
 </svg>
}

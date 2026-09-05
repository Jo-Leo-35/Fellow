import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Badge, Box, Button, Flex, HStack, Text, VStack, usePrefersReducedMotion } from "@chakra-ui/react";

type ScienceTopic = "newton" | "thermodynamics" | "entropy" | "equilibrium" | "bonding" | "reaction-rate";

const ink = "#14324A";
const teal = "#08796F";
const blue = "#3B8EF3";

function useTeachingAnimation(captions: string[], onStep: (step: number) => void) {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [complete, setComplete] = useState(false);
  const [run, setRun] = useState(0);
  const reducedMotion = usePrefersReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const applyStep = useRef(onStep);
  useEffect(() => { applyStep.current = onStep; }, [onStep]);
  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(() => {
      if (step + 1 === captions.length) { setPlaying(false); setComplete(true); }
      else { setStep(step + 1); applyStep.current(step + 1); }
    }, 2400);
    return () => window.clearTimeout(timer);
  }, [playing, step, captions.length, run]);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => { if (!entry.isIntersecting) setPlaying(false); });
    if (ref.current) observer.observe(ref.current);
    const onVisibility = () => { if (document.hidden) setPlaying(false); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", onVisibility); };
  }, []);
  const start = (next: number) => {
    setStep(next); applyStep.current(next); setStarted(true); setComplete(false); setPlaying(true); setRun((current) => current + 1);
  };
  const explore = () => { setPlaying(false); setStarted(false); setComplete(false); setStep(0); };
  return {
    ref, step, playing, started, complete, reducedMotion, explore,
    transition: reducedMotion || !playing ? "none" : "transform 1.5s ease-in-out",
    caption: captions[step], count: captions.length,
    playPause: () => playing ? setPlaying(false) : start(complete ? 0 : step),
    replay: () => start(0),
  };
}

type AnimationPlayer = ReturnType<typeof useTeachingAnimation>;

function Frame({ title, player, children }: { title: string; player: AnimationPlayer; children: ReactNode }) {
  return (
    <Box ref={player.ref} as="section" role="region" aria-label="教學動畫播放器" bg="#F5FAFC" border="1px solid" borderColor="#DCECEF" borderRadius="16px" p={4} w="full">
      <HStack justify="space-between" mb={3} spacing={2} align="flex-start">
        <Text fontSize="sm" fontWeight={800} color="navy.700" minW={0} lineHeight="1.6">{title}</Text>
        <Badge colorScheme="teal" fontSize="10px" borderRadius="full" px={2} py={1} flexShrink={0}>教學動畫</Badge>
      </HStack>
      <HStack spacing={2} mb={3}>
        <Button size="sm" fontSize="xs" flex={1} onClick={player.playPause}>{player.playing ? "暫停動畫" : "播放動畫"}</Button>
        <Button size="sm" fontSize="xs" variant="outline" flex={1} onClick={player.replay}>重播動畫</Button>
      </HStack>
      <Box mb={3} p={3} bg="white" borderRadius="10px" aria-live="polite" aria-atomic="true">
        <Text fontSize="10px" fontWeight={800} color="brand.700">{player.started ? `第 ${player.step + 1} / ${player.count} 步${player.complete ? " · 播放完成" : player.playing ? "" : " · 已暫停"}` : "跟著動畫，一步步理解"}</Text>
        <Text mt={1} fontSize="xs" lineHeight="1.8" color="navy.500">{player.started ? player.caption : "按下播放觀察變化，也可以直接操作下方控制項。"}</Text>
        <Box h="3px" bg="brand.50" borderRadius="full" mt={2} aria-hidden="true"><Box h="full" bg="brand.500" borderRadius="full" w={player.started ? `${((player.step + 1) / player.count) * 100}%` : "0%"} /></Box>
      </Box>
      {children}
    </Box>
  );
}

function RangeControl({ label, value, unit, min, max, onChange }: {
  label: string; value: number; unit: string; min: number; max: number; onChange: (value: number) => void;
}) {
  const id = useId();
  return (
    <Box w="full">
      <Flex as="label" htmlFor={id} align="center" justify="space-between" gap={2} fontSize="xs" fontWeight={700}>
        <Text as="span">{label}</Text>
        <Text as="span" color="brand.700">{value} {unit}</Text>
      </Flex>
      <input
        id={id} type="range" min={min} max={max} step={1} value={value}
        aria-label={label} aria-valuetext={`${value} ${unit}`}
        onChange={(event) => onChange(Number(event.target.value))}
        style={{ width: "100%", minHeight: 32, accentColor: teal, cursor: "pointer", display: "block" }}
      />
    </Box>
  );
}

function Takeaway({ children }: { children: ReactNode }) {
  return <Text mt={3} fontSize="xs" color="navy.500" lineHeight="1.8" aria-live="polite">{children}</Text>;
}

function Toggle({ active, onChange, labels }: {
  active: boolean; onChange: (value: boolean) => void; labels: [string, string];
}) {
  return (
    <HStack spacing={2} mt={3}>
      {labels.map((label, index) => (
        <Button key={label} size="sm" flex={1} whiteSpace="normal" h="auto" minH="36px" py={2} px={2}
          fontSize="xs" variant={active === Boolean(index) ? "solid" : "outline"}
          colorScheme="teal" aria-pressed={active === Boolean(index)} onClick={() => onChange(Boolean(index))}>
          {label}
        </Button>
      ))}
    </HStack>
  );
}

function NewtonSimulation() {
  const [force, setForce] = useState(10);
  const [mass, setMass] = useState(5);
  const player = useTeachingAnimation([
    "先看合力為零：加速度為零，物體會保持原本的運動狀態。",
    "給 5 kg 的小車 10 N 合力，加速度變成 2 m/s²。",
    "質量不變，合力加倍到 20 N，加速度也加倍為 4 m/s²。",
    "保持 20 N 合力，把質量加倍到 10 kg，加速度就減半為 2 m/s²。",
  ], (step) => { setForce([0, 10, 20, 20][step]); setMass([5, 5, 5, 10][step]); });
  const acceleration = force / mass;
  const arrowEnd = 176 + force * 4;
  return (
    <Frame title="推力與質量，誰影響加速度？" player={player}>
      <svg viewBox="0 0 320 128" role="img" aria-label={`質量 ${mass} 公斤的小車，${force ? `向右合力 ${force} 牛頓` : "合力為零"}，加速度為 ${acceleration.toFixed(1)} 公尺每秒平方。`} style={{ width: "100%", display: "block" }}>
        <line x1="20" y1="108" x2="302" y2="108" stroke="#C4D9E3" strokeWidth="2" />
        <g style={{ transform: `translateX(${player.started ? player.step * 7 : 0}px)`, transition: player.transition }}>
        <rect x="48" y="56" width="112" height="39" rx="10" fill="#C9F3EE" stroke={teal} strokeWidth="2" />
        <circle cx="73" cy="101" r="8" fill={ink} /><circle cx="135" cy="101" r="8" fill={ink} />
        <text x="104" y="81" textAnchor="middle" fill={ink} fontSize="15" fontWeight="700">{mass} kg</text>
        {force > 0 && <><line x1="164" y1="74" x2={arrowEnd} y2="74" stroke={teal} strokeWidth="4" /><path d={`M ${arrowEnd - 9} 68 L ${arrowEnd} 74 L ${arrowEnd - 9} 80`} fill="none" stroke={teal} strokeWidth="3" /></>}
        <text x="222" y="48" textAnchor="middle" fill={teal} fontSize="13" fontWeight="700">合力 {force} N{force > 0 ? " →" : ""}</text>
        </g>
        <text x="20" y="20" fill="#5D7587" fontSize="11">水平受力示意・位移不按時間比例</text>
      </svg>
      <VStack spacing={2} align="stretch">
        <RangeControl label="合力 F" value={force} unit="N" min={0} max={20} onChange={(value) => { player.explore(); setForce(value); }} />
        <RangeControl label="質量 m" value={mass} unit="kg" min={1} max={10} onChange={(value) => { player.explore(); setMass(value); }} />
      </VStack>
      <Box bg="white" borderRadius="10px" p={3} mt={2} textAlign="center" aria-live="polite">
        <Text color="brand.700" fontWeight={800} fontSize="md">a = F ÷ m = {acceleration.toFixed(1)} m/s²</Text>
      </Box>
      <Takeaway>{force === 0 ? "合力為零，加速度就是零。小車可能靜止，也可能保持等速度運動。" : "試著保持合力不變，再增加質量：加速度會變小。加速度描述速度如何改變，並不是目前的速度。"}</Takeaway>
    </Frame>
  );
}

function ThermodynamicsSimulation() {
  const [heat, setHeat] = useState(60);
  const [work, setWork] = useState(20);
  const player = useTeachingAnimation([
    "先把能量收支歸零，觀察接下來能量如何進出系統。",
    "吸收 60 J 熱量、沒有對外做功，內能增加 60 J。",
    "若吸熱 60 J、對外做功 20 J，內能淨增加 40 J。",
    "換個情況：吸熱 20 J 卻做功 60 J，內能就減少 40 J。",
  ], (step) => { setHeat([0, 60, 60, 20][step]); setWork([0, 0, 20, 60][step]); });
  const change = heat - work;
  return (
    <Frame title="進來的熱，都留在系統裡嗎？" player={player}>
      <svg viewBox="0 0 320 124" role="img" aria-label={`系統吸熱 ${heat} 焦耳，對外做功 ${work} 焦耳，內能改變 ${change} 焦耳。`} style={{ width: "100%", display: "block" }}>
        <rect x="111" y="19" width="98" height="70" rx="14" fill="#E0F1FA" stroke="#B0D5EB" />
        <text x="160" y="44" textAnchor="middle" fill={ink} fontSize="12">系統內能</text>
        <text x="160" y="75" textAnchor="middle" fill={teal} fontSize="18" fontWeight="700">U</text>
        <path d="M 22 56 L 103 56 M 95 49 L 103 56 L 95 63" fill="none" stroke="#DB8840" strokeWidth="4" />
        <path d="M 217 56 L 296 56 M 288 49 L 296 56 L 288 63" fill="none" stroke={blue} strokeWidth="4" />
        <text x="62" y="36" textAnchor="middle" fill="#A45E1E" fontSize="12">吸熱 Q</text>
        <text x="62" y="83" textAnchor="middle" fill={ink} fontSize="13" fontWeight="700">{heat} J</text>
        <text x="258" y="36" textAnchor="middle" fill="#266CBD" fontSize="12">對外做功 W</text>
        <text x="258" y="83" textAnchor="middle" fill={ink} fontSize="13" fontWeight="700">{work} J</text>
        <text x="160" y="113" textAnchor="middle" fill="#5D7587" fontSize="11">封閉系統・忽略整體動能與位能變化</text>
      </svg>
      <VStack spacing={2} align="stretch">
        <RangeControl label="系統吸收熱量 Q" value={heat} unit="J" min={0} max={100} onChange={(value) => { player.explore(); setHeat(value); }} />
        <RangeControl label="系統對外做功 W" value={work} unit="J" min={0} max={100} onChange={(value) => { player.explore(); setWork(value); }} />
      </VStack>
      <Box bg="white" borderRadius="10px" p={3} mt={2} textAlign="center" aria-live="polite">
        <Text color="brand.700" fontWeight={800} fontSize="md">ΔU = Q − W = {change > 0 ? "+" : ""}{change} J</Text>
        <Text mt={1} fontSize="11px" color="#5D7587">{change > 0 ? "內能增加" : change < 0 ? "內能減少" : "內能不變"}</Text>
        <VStack spacing={1} mt={2} aria-hidden="true">
          <HStack w="full" spacing={2}><Text w="14px" fontSize="10px" color="#A45E1E">Q</Text><Box flex={1} h="5px" bg="#FFF0E4" borderRadius="full"><Box w={`${heat}%`} h="full" bg="#DB8840" borderRadius="full" transition={player.reducedMotion || !player.playing ? "none" : "width 1.5s ease"} /></Box></HStack>
          <HStack w="full" spacing={2}><Text w="14px" fontSize="10px" color="#266CBD">W</Text><Box flex={1} h="5px" bg="#E0F1FA" borderRadius="full"><Box w={`${work}%`} h="full" bg={blue} borderRadius="full" transition={player.reducedMotion || !player.playing ? "none" : "width 1.5s ease"} /></Box></HStack>
        </VStack>
      </Box>
      <Takeaway>{change < 0 ? "即使有吸熱，若對外做的功更多，內能仍會減少。這裡把「系統對外做功」定為正值。" : "熱是能量傳遞的方式。吸收的能量可以增加內能，也可以透過對外做功離開系統；吸熱不一定等於升溫。"}</Takeaway>
    </Frame>
  );
}

const spreadParticles = [[44, 51], [91, 86], [135, 40], [160, 108], [200, 54], [255, 78], [283, 43], [228, 110], [60, 120], [115, 123], [181, 78], [279, 126], [39, 85], [125, 78], [243, 42], [210, 87]];
const confinedParticles = [[43, 48], [73, 52], [107, 44], [138, 56], [53, 77], [83, 84], [122, 77], [141, 92], [43, 111], [69, 123], [102, 111], [131, 123], [43, 134], [80, 105], [105, 138], [137, 140]];

function EntropySimulation() {
  const [open, setOpen] = useState(false);
  const player = useTeachingAnimation([
    "隔板把氣體限制在左半邊，右半邊是真空。",
    "移除隔板後，粒子可以進入原本到不了的空間。",
    "粒子持續朝各方向運動；分散狀態對應更多微觀排列，氣體的熵增加。",
    "另一組粒子位置仍呈現分散狀態。圖中路徑只用來連接前後位置。",
  ], (step) => setOpen(step > 0));
  return (
    <Frame title="氣體為什麼會自行散開？" player={player}>
      <svg viewBox="0 0 320 185" role="img" aria-label={open ? "移除隔板後，氣體粒子分散在容器兩側，示意更可能出現的宏觀狀態。" : "隔板把氣體限制在容器左半邊，右半邊是真空。"} style={{ width: "100%", display: "block" }}>
        <rect x="21" y="25" width="278" height="130" rx="12" fill="white" stroke="#BCD6E1" strokeWidth="2" />
        <rect x="23" y="27" width={open ? "274" : "136"} height="126" rx="10" fill="#E8FBF8" />
        <line x1="160" y1="27" x2="160" y2="153" stroke={open ? "#BCD6E1" : ink} strokeWidth={open ? 1 : 4} strokeDasharray={open ? "4 5" : undefined} />
        {(open ? spreadParticles : confinedParticles).map((point, index) => {
          const [x, y] = open && player.started ? spreadParticles[(index + player.step * 3) % spreadParticles.length] : point;
          return <circle key={index} r="5" fill={index % 3 === 0 ? blue : teal} style={{ transform: `translate(${x}px, ${y}px)`, transition: player.transition }} />;
        })}
        {!open && <text x="228" y="92" textAnchor="middle" fill="#5D7587" fontSize="13">真空</text>}
        <text x="160" y="177" textAnchor="middle" fill="#5D7587" fontSize="11">理想氣體向真空自由膨脹・粒子位置示意</text>
      </svg>
      <Toggle active={open} onChange={(value) => { player.explore(); setOpen(value); }} labels={["原本：隔板還在", "觀察：移除隔板"]} />
      <Takeaway>{open ? "可用空間增加，對應的微觀排列數也增加，氣體的熵上升。分散在兩側的狀態遠比全部擠在一側常見；粒子仍會朝各方向運動。" : "左側氣體受隔板限制。想像移除隔板後：氣體會繼續集中，還是分散到更大的空間？按下右側按鈕觀察。"}</Takeaway>
    </Frame>
  );
}

function EquilibriumSimulation() {
  const [added, setAdded] = useState(false);
  const player = useTeachingAnimation([
    "先看原本的平衡：正反應與逆反應都在進行。",
    "兩個方向的反應速率相等，所以各物質濃度維持不變。",
    "固定溫度與體積，加入 N₂O₄，系統傾向生成更多 NO₂。",
    "達到新的動態平衡時，正逆反應速率再次相等；溫度不變，K 也不變。",
  ], (step) => setAdded(step >= 2));
  return (
    <Frame title="平衡，代表反應停止了嗎？" player={player}>
      <svg viewBox="0 0 320 157" role="img" aria-label={added ? "在固定溫度與體積下加入四氧化二氮，系統傾向生成更多二氧化氮。" : "四氧化二氮與二氧化氮之間的可逆反應達到動態平衡。"} style={{ width: "100%", display: "block" }}>
        <rect x="15" y="19" width="95" height="105" rx="13" fill="#EEEAFB" />
        <rect x="213" y="19" width="92" height="105" rx="13" fill="#FFF0E4" />
        <circle cx="50" cy="58" r="14" fill="#9480C2" /><circle cx="73" cy="58" r="14" fill="#9480C2" />
        <circle cx="241" cy="49" r="12" fill="#C67743" /><circle cx="276" cy="70" r="12" fill="#C67743" />
        <text x="63" y="101" textAnchor="middle" fill={ink} fontSize="17" fontWeight="700">N₂O₄</text>
        <text x="259" y="101" textAnchor="middle" fill={ink} fontSize="17" fontWeight="700">2 NO₂</text>
        <path d="M 123 58 H 198 L 190 52 M 198 80 H 123 L 131 86" fill="none" stroke={teal} strokeWidth="2.5" />
        {player.started && <g aria-hidden="true"><circle cy="58" r="4" fill={blue} style={{ transform: `translateX(${[126, 148, 170, 190][player.step]}px)`, transition: player.transition }} /><circle cy="80" r="4" fill="#9480C2" style={{ transform: `translateX(${[195, 173, 151, 129][player.step]}px)`, transition: player.transition }} /></g>}
        {added && <><rect x="108" y="21" width="105" height="23" rx="11" fill="#C9F3EE" /><text x="160" y="37" textAnchor="middle" fill={teal} fontSize="11" fontWeight="700">{player.started && player.step === 3 ? "新的動態平衡" : "傾向生成更多 NO₂"}</text><text x="63" y="14" textAnchor="middle" fill="#7560A4" fontSize="11" fontWeight="700">加入 N₂O₄ ↓</text></>}
        <text x="160" y="147" textAnchor="middle" fill="#5D7587" fontSize="11">固定溫度與體積・圖示不代表濃度或反應時間</text>
      </svg>
      <Toggle active={added} onChange={(value) => { player.explore(); setAdded(value); }} labels={["原本的動態平衡", "加入反應物 N₂O₄"]} />
      <Takeaway>{added ? "加入 N₂O₄ 後，系統傾向生成更多 NO₂，直到達到新的平衡。溫度固定，平衡常數 K 不變；反應物也不會全部耗盡。" : "動態平衡時，正反應與逆反應仍持續進行，兩者速率相等，所以各物質的濃度維持不變；濃度不需要彼此相等。"}</Takeaway>
    </Frame>
  );
}

function BondingSimulation() {
  const [hydrogen, setHydrogen] = useState(false);
  const player = useTeachingAnimation([
    "先看實線：一個水分子內，O 與 H 透過共用電子形成共價鍵。",
    "氧較能吸引共用電子。觀察藍色電子分布示意偏向 O，因此 O 帶 δ−、H 帶 δ+。",
    "再看虛線：一個水分子的 H 與另一個水分子的 O，可形成分子間的氫鍵。",
    "分子內的共價鍵與分子間的氫鍵位置不同；水沸騰時，水分子本身仍保留。",
  ], (step) => setHydrogen(step >= 2));
  return (
    <Frame title="水分子內與分子間，如何連結？" player={player}>
      <svg viewBox="0 0 320 172" role="img" aria-label={hydrogen ? "兩個水分子間，帶部分正電的氫與另一分子帶部分負電的氧形成氫鍵，以虛線表示。" : "每個水分子內的氧氫共價鍵以實線表示；氧帶部分負電，氫帶部分正電。"} style={{ width: "100%", display: "block" }}>
        {player.started && player.step < 2 && <ellipse cy="68" rx="37" ry="25" fill="#3B8EF3" opacity="0.16" style={{ transform: `translateX(${player.step === 0 ? 108 : 89}px)`, transition: player.transition }} />}
        <g stroke={hydrogen ? "#A2B9C8" : teal} strokeWidth={hydrogen ? 4 : 6}>
          <line x1="88" y1="56" x2="42" y2="82" /><line x1="88" y1="56" x2="133" y2="85" />
          <line x1="218" y1="113" x2="255" y2="75" /><line x1="218" y1="113" x2="264" y2="137" />
        </g>
        {hydrogen && <><line x1="146" y1="89" x2="197" y2="106" stroke={blue} strokeWidth="3" strokeDasharray="5 4" /><text x="167" y="65" fill="#266CBD" fontSize="12" textAnchor="middle" fontWeight="700">氫鍵</text></>}
        {[[88, 56], [218, 113]].map(([x, y]) => <g key={x}><circle cx={x} cy={y} r="21" fill="#F7CBC9" stroke="#D89593" /><text x={x} y={y + 5} textAnchor="middle" fill="#803D3A" fontSize="16" fontWeight="700">O</text><text x={x} y={y - 28} textAnchor="middle" fill="#803D3A" fontSize="12">δ−</text></g>)}
        {[[42, 82], [133, 85], [255, 75], [264, 137]].map(([x, y]) => <g key={x}><circle cx={x} cy={y} r="14" fill="#E1F0FB" stroke="#ACCDE5" /><text x={x} y={y + 4} textAnchor="middle" fill={ink} fontSize="13" fontWeight="700">H</text><text x={x + 20} y={y + 3} fill="#266CBD" fontSize="11">δ+</text></g>)}
        <text x="90" y="139" textAnchor="middle" fill={hydrogen ? "#5D7587" : teal} fontSize="11">實線：O—H 共價鍵</text>
        <text x="160" y="166" textAnchor="middle" fill="#5D7587" fontSize="10">δ 表示部分電荷・分子結構示意</text>
      </svg>
      <Toggle active={hydrogen} onChange={(value) => { player.explore(); setHydrogen(value); }} labels={["分子內：共價鍵", "分子間：氫鍵"]} />
      <Takeaway>{hydrogen ? "一個水分子的 H（δ+）能與另一個水分子的 O（δ−）形成氫鍵。水沸騰時主要克服分子間吸引力，水分子內的 O—H 共價鍵仍保留。" : "O 與 H 共用電子形成共價鍵。氧吸引共用電子的能力較強，因此帶部分負電；氫帶部分正電，但整個水分子仍呈電中性。"}</Takeaway>
    </Frame>
  );
}

function ReactionRateSimulation() {
  const [catalyst, setCatalyst] = useState(false);
  const player = useTeachingAnimation([
    "從反應物出發。注意曲線前後的高度，代表反應物與產物的能量。",
    "未催化途徑需要跨越較高的活化能障礙。",
    "加入催化劑後，可以走活化能較低的另一條反應途徑。",
    "兩條路徑的終點相同。催化劑不改變能量差、平衡常數或平衡組成。",
  ], (step) => setCatalyst(step >= 2));
  return (
    <Frame title="催化劑如何讓反應更容易發生？" player={player}>
      <svg viewBox="0 0 320 177" role="img" aria-label={catalyst ? "催化劑提供活化能較低的反應途徑，反應物與產物的能量差保持相同。" : "反應物必須跨越活化能障礙才能生成產物，圖中以放熱反應示意。"} style={{ width: "100%", display: "block" }}>
        <path d="M 37 17 V 148 H 300" fill="none" stroke="#9BB5C4" strokeWidth="1.5" />
        <text x="13" y="22" fill="#5D7587" fontSize="11">能量</text>
        <text x="260" y="167" fill="#5D7587" fontSize="11">反應進程 →</text>
        <path d="M 50 107 H 79 C 117 107 113 29 158 29 S 202 128 260 128 H 293" fill="none" stroke={catalyst ? "#9CAFC0" : teal} strokeWidth="3" strokeDasharray={catalyst ? "5 4" : undefined} />
        {catalyst && <path d="M 50 107 H 79 C 115 107 117 71 158 71 S 211 128 260 128 H 293" fill="none" stroke={teal} strokeWidth="3.5" />}
        {player.started && <circle r="7" fill="#F6A63C" opacity="0.8" aria-hidden="true" style={{ transform: `translate(${[65, 158, 158, 280][player.step]}px, ${[107, 29, 71, 128][player.step]}px)`, transition: player.transition }} />}
        <line x1="85" y1="107" x2="158" y2="107" stroke="#BED1DE" strokeDasharray="3 4" />
        <path d={`M 158 103 V ${catalyst ? 75 : 33} M 154 ${catalyst ? 81 : 39} L 158 ${catalyst ? 75 : 33} L 162 ${catalyst ? 81 : 39}`} fill="none" stroke={teal} strokeWidth="1.5" />
        <text x="166" y={catalyst ? 97 : 83} fill={teal} fontSize="11" fontWeight="700">活化能</text>
        <text x="158" y="18" textAnchor="middle" fill={catalyst ? "#61798C" : teal} fontSize="11">未催化途徑</text>
        {catalyst && <text x="213" y="62" fill={teal} fontSize="11" fontWeight="700">催化途徑</text>}
        <text x="53" y="126" fill={ink} fontSize="11">反應物</text><text x="263" y="117" fill={ink} fontSize="11">產物</text>
      </svg>
      <Toggle active={catalyst} onChange={(value) => { player.explore(); setCatalyst(value); }} labels={["沒有催化劑", "加入催化劑"]} />
      <Takeaway>{catalyst ? "催化劑提供較低活化能的反應途徑，可加速到達平衡。它不改變平衡常數或平衡組成，也不改變反應物與產物的能量差。" : "碰撞不一定能反應，還需要足夠能量與合適方向。曲線高度示意活化能障礙；試著加入催化劑，觀察路徑怎麼變。"}</Takeaway>
      <Text mt={2} color="#61798C" fontSize="10px">以放熱反應示意；曲線不代表特定反應的量測數據。</Text>
    </Frame>
  );
}

export function ScienceSimulation({ topic }: { topic: ScienceTopic }) {
  switch (topic) {
    case "newton": return <NewtonSimulation />;
    case "thermodynamics": return <ThermodynamicsSimulation />;
    case "entropy": return <EntropySimulation />;
    case "equilibrium": return <EquilibriumSimulation />;
    case "bonding": return <BondingSimulation />;
    case "reaction-rate": return <ReactionRateSimulation />;
  }
}

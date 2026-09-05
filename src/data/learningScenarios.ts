/**
 * Original, fictional teaching materials for the local RAG demonstration.
 * Retrieval below is deterministic keyword matching, not an embedding model or
 * a live language-model call. Answers are authored against these exact excerpts.
 */
export type LearningTopic = 'newton' | 'thermodynamics' | 'entropy' | 'equilibrium' | 'bonding' | 'reaction-rate'

export interface MaterialChunk {
  id: string
  topic: LearningTopic
  title: string
  chapter: string
  page: string
  content: string
  keywords: string[]
}

export interface LearningStep {
  title: string
  body: string
  sourceIds: string[]
}

export interface LearningFollowUp {
  question: string
  keywords: string[]
  title: string
  summary: string
  steps: LearningStep[]
  sourceIds: string[]
}

export interface LearningScenario {
  id: LearningTopic
  subject: '物理' | '化學'
  title: string
  subtitle: string
  question: string
  keywords: string[]
  summary: string
  formula: string
  formulaNote: string
  steps: LearningStep[]
  analogy: string
  misconception: string
  sourceIds: string[]
  practice: { question: string; options: string[]; answerIndex: number; explanation: string }
  followUps: LearningFollowUp[]
}

export const materialChunks: MaterialChunk[] = [
  {
    id: 'newton-1', topic: 'newton', title: '學伴教材｜從受力看運動', chapter: '第 1 章・合力與加速度', page: 'p. 12',
    content: '在慣性參考系中，對質量固定的物體，牛頓第二定律為 ΣF = ma。ΣF 是作用在同一物體上的所有外力之向量和；加速度表示速度大小或方向的改變。物體受到力不代表合力不為零：桌上靜止的書同時受到向下的重力和向上的支持力，兩力平衡，所以加速度為零。合力為零也可能是等速度直線運動。',
    keywords: ['牛頓', '牛頓力學', '第二定律', '合力', '加速度', '受力', '支持力', '重力', 'ΣF', 'ma'],
  },
  {
    id: 'newton-2', topic: 'newton', title: '學伴教材｜從受力看運動', chapter: '第 1 章・慣性與煞車', page: 'p. 13',
    content: '牛頓第一定律描述慣性：若合外力為零，物體保持靜止或等速度直線運動。以地面近似為慣性參考系，公車煞車時，乘客身體原本具有向前的速度，不會自動跟著車子減速，所以相對車廂向前移動。安全帶或扶手提供使人減速的外力。慣性是一種維持原本運動狀態的性質，不是額外向前推人的力。',
    keywords: ['牛頓', '牛頓力學', '第一定律', '慣性', '公車', '車子', '煞車', '急煞', '前傾', '安全帶'],
  },
  {
    id: 'newton-3', topic: 'newton', title: '學伴教材｜從受力看運動', chapter: '第 1 章・力的配對與摩擦', page: 'p. 14',
    content: '牛頓第三定律指出，物體 A 對 B 的力與 B 對 A 的力大小相等、方向相反，卻作用在不同物體上。因此只分析 A 的受力時，不可把這一對力互相抵消。推牆時，手推牆、牆推手即為一對。分析箱子時，推力和地面對箱子的摩擦力都作用在箱子上，可以相加；若大小相等、方向相反，箱子可等速度前進。這兩力並不是第三定律的一對。',
    keywords: ['牛頓', '牛頓力學', '第三定律', '作用力', '反作用力', '推牆', '抵消', '摩擦', '等速', '箱子', '推力'],
  },
  {
    id: 'thermodynamics-1', topic: 'thermodynamics', title: '學伴教材｜能量如何流動', chapter: '第 2 章・溫度、熱量與內能', page: 'p. 22',
    content: '熱力學研究系統的能量與能量傳遞。內能 U 是系統微觀粒子運動和交互作用所對應的能量總和，不包含整個系統的整體平移動能或位置位能。溫度是判斷熱平衡與自發熱傳方向的狀態量；兩物體接觸時，熱自發由高溫流向低溫。熱量 Q 是因溫度差而跨越系統邊界傳遞的能量，不是物體內「存著的熱」。同溫的一杯水與一桶水，內能總量並不相同。',
    keywords: ['熱力學', '溫度', '熱量', '內能', '熱平衡', '能量', '一杯水', '一桶水'],
  },
  {
    id: 'thermodynamics-2', topic: 'thermodynamics', title: '學伴教材｜能量如何流動', chapter: '第 2 章・第一定律的收支', page: 'p. 23',
    content: '對封閉系統，忽略系統整體動能與位能的改變，熱力學第一定律為 ΔU = Q − W。本教材規定 Q > 0 表示系統吸熱，W > 0 表示系統對外做功。因此吸收 100 J 熱量並向外做功 40 J，內能增加 60 J；外界對系統做功時 W 為負。熱與功都是能量傳遞的方式，只有明確指定系統和正負號，才能計算收支。',
    keywords: ['熱力學', '第一定律', '內能', '熱量', '做功', '100', '40', '60', '正負', 'ΔU', 'Q', 'W'],
  },
  {
    id: 'thermodynamics-3', topic: 'thermodynamics', title: '學伴教材｜能量如何流動', chapter: '第 2 章・壓縮、絕熱與等溫', page: 'p. 24',
    content: '熱力學中的絕熱表示沒有熱量跨越邊界，即 Q = 0；它不代表溫度固定。快速壓縮氣體可近似絕熱，外界對氣體做功，所以系統對外做功 W < 0，ΔU = −W > 0。對定量理想氣體，內能只與溫度有關，因此溫度上升。等溫則是溫度固定；定量理想氣體等溫膨脹時 ΔU = 0，需吸熱補回對外做的功，因此 Q = W。',
    keywords: ['熱力學', '內能', '溫度', '壓縮', '打氣', '打氣筒', '變熱', '絕熱', '等溫', '理想氣體', '做功'],
  },
  {
    id: 'entropy-1', topic: 'entropy', title: '學伴教材｜理解熵與自發過程', chapter: '第 3 章・從微觀排列理解熵', page: 'p. 32',
    content: '熵 S 是狀態量，可用來描述符合巨觀條件的微觀狀態數目。在等機率的微觀狀態模型中，S = k_B ln Ω，Ω 是可及微觀狀態數。把熵只叫作「混亂程度」容易誤解；更好的起點是問粒子和能量有多少種可能的分配方式。對孤立系統，自發過程的總熵不減。若研究的系統會與環境交換能量或物質，系統自身的熵則可能降低。',
    keywords: ['熵', '熵增加', '第二定律', '微觀', '排列', '混亂', '分配', '孤立系統', '總熵'],
  },
  {
    id: 'entropy-2', topic: 'entropy', title: '學伴教材｜理解熵與自發過程', chapter: '第 3 章・冰箱沒有違反第二定律', page: 'p. 33',
    content: '熱力學第二定律約束系統與環境的總熵，而不是要求每個局部的熵都增加。冰箱由外界供給電功，把熱量從低溫空間搬到較高溫的室內，排出的熱包含移出的熱與輸入的功。水結冰時水的熵可以減少，但散熱使環境熵增加；計入所有交換與不可逆過程後，總熵仍不減。局部有序化並不違反第二定律。',
    keywords: ['熵', '熵增加', '第二定律', '冰箱', '結冰', '水變成冰', '電功', '局部', '環境', '總熵', '降低', '減少'],
  },
  {
    id: 'entropy-3', topic: 'entropy', title: '學伴教材｜理解熵與自發過程', chapter: '第 3 章・氣體為什麼會混合', page: 'p. 34',
    content: '理想氣體原本位於隔熱剛性容器的一側、另一側是真空；移除隔板後，氣體自由膨脹，粒子可分布的空間增加。此過程沒有對外做功或熱交換，理想氣體溫度不變，但可及微觀狀態數與熵增加。另一個例子是兩種不同的理想氣體在相同溫度與壓力下分居容器兩側，移除隔板後自發混合，每種氣體都可分布在更大的空間，熵增加。氣體並非有意選擇混亂，而是混合的微觀排列遠比完全分開的排列多。這個不同氣體的混合例子不能直接套到原本同溫同壓、性質完全相同的同種氣體。',
    keywords: ['熵', '熵增加', '混合', '氣體', '隔板', '擴散', '微觀', '排列', '分開', '真空', '自由膨脹'],
  },
  {
    id: 'equilibrium-1', topic: 'equilibrium', title: '學伴教材｜看不見的動態平衡', chapter: '第 4 章・濃度不變，反應未停', page: 'p. 42',
    content: '在適當的封閉條件與固定溫度下，可逆反應可達到化學平衡。動態平衡時，正反應速率等於逆反應速率，所以反應物與生成物的巨觀濃度不隨時間改變；微觀反應仍持續發生。正逆速率相等不代表反應物與生成物濃度相等。以簡化反應 A ⇌ B 為例，平衡可以是 A 多 B 少，也可以相反。',
    keywords: ['化學平衡', '平衡', '動態平衡', '濃度', '正反應', '逆反應', '反應還在', '反應停止', '相等'],
  },
  {
    id: 'equilibrium-2', topic: 'equilibrium', title: '學伴教材｜看不見的動態平衡', chapter: '第 4 章・濃度與溫度的擾動', page: 'p. 43',
    content: '對理想稀溶液的簡化反應 A ⇌ B，固定溫度下 K_c = [B]_eq / [A]_eq。向平衡混合物加入 A，使當下的 [B]/[A] 小於 K_c，淨反應暫時往 B 的方向進行，直到恢復符合平衡常數的比例；加入 A 不代表 A 會完全消失。對可近似理想的氣相反應 N₂O₄(g) ⇌ 2NO₂(g)，Q_c = [NO₂]² / [N₂O₄]；在固定溫度與體積下加入 N₂O₄，當下 Q_c 降低，淨反應往生成 NO₂ 的方向進行，直到 Q_c 再次等於 K_c。在其他條件合適時，若正反應放熱，升溫會使平衡朝吸熱的逆反應方向移動，K 減小。改變濃度不改變固定溫度下的 K；改變溫度則會改變 K。',
    keywords: ['化學平衡', '平衡', '濃度', '加入', '增加反應物', '生成物', '平衡常數', '溫度', '升溫', '放熱', '吸熱', '往右', '移動', 'N₂O₄', 'NO₂'],
  },
  {
    id: 'equilibrium-3', topic: 'equilibrium', title: '學伴教材｜看不見的動態平衡', chapter: '第 4 章・催化劑改變的是快慢', page: 'p. 44',
    content: '催化劑提供較低活化能的反應路徑，使可逆反應更快達到化學平衡。它同時影響正、逆反應速率，不改變指定溫度下的平衡常數與平衡組成。若系統已在平衡，加入催化劑不會讓平衡往右或往左移動。達到相同的終點更快，不等於平衡時得到更多生成物。',
    keywords: ['化學平衡', '平衡', '催化劑', '觸媒', '平衡常數', '平衡組成', '生成物', '往右', '往左', '速率', '移動'],
  },
  {
    id: 'bonding-1', topic: 'bonding', title: '學伴教材｜分子裡與分子之間', chapter: '第 5 章・共價鍵與氫鍵', page: 'p. 52',
    content: '化學鍵中的共價鍵可用原子共享電子對來理解。一個水分子內，氧原子與兩個氫原子以 O–H 共價鍵連接。水分子具有極性：氧端帶部分負電、氫端帶部分正電。在液態水中，一個水分子的氫端可與另一個水分子的氧端形成氫鍵。此處的分子間氫鍵與分子內 O–H 共價鍵是不同層級的作用，不能把兩者當成同一條鍵；氫鍵也可能存在於合適分子的內部。',
    keywords: ['化學鍵', '共價鍵', '氫鍵', '水分子', '極性', '電子', '分子間', '分子內', '不同'],
  },
  {
    id: 'bonding-2', topic: 'bonding', title: '學伴教材｜分子裡與分子之間', chapter: '第 5 章・沸騰為什麼不是分解', page: 'p. 53',
    content: '水在一般條件下沸騰，是水分子從液相進入氣相的物理變化。輸入能量主要用來克服水分子之間的吸引作用，包括氫鍵；水分子內的 O–H 共價鍵仍維持，所以水蒸氣主要仍是 H₂O，並未變成氫氣與氧氣。液態水中的氫鍵本來就在不斷形成與斷開。把水分解成氫氣和氧氣屬於另一個涉及化學鍵重組的化學反應，例如電解水。',
    keywords: ['化學鍵', '氫鍵', '共價鍵', '沸騰', '煮沸', '水蒸氣', '氫氣', '氧氣', '分解', '斷裂', '斷開', '電解'],
  },
  {
    id: 'bonding-3', topic: 'bonding', title: '學伴教材｜分子裡與分子之間', chapter: '第 5 章・食鹽溶解與水合', page: 'p. 54',
    content: '食鹽固體是 Na⁺ 和 Cl⁻ 構成的離子晶格，不是獨立的 NaCl 分子集合。食鹽溶於水時，在未達飽和的適當條件下，極性水分子與離子的吸引有助於離子脫離晶格並形成水合離子：水的氧端較靠近 Na⁺，氫端較靠近 Cl⁻。這主要是離子－偶極作用，不是把離子都接成新的共價分子，也不是所有離子化合物都能大量溶於水。',
    keywords: ['化學鍵', '離子鍵', '食鹽', '鹽', '溶解', '水合', '離子', 'NaCl', '氯化鈉', '共價鍵', '水分子'],
  },
  {
    id: 'reaction-rate-1', topic: 'reaction-rate', title: '學伴教材｜粒子碰撞與反應快慢', chapter: '第 6 章・有效碰撞與溫度', page: 'p. 62',
    content: '反應速率描述反應物消耗或生成物形成的快慢。碰撞模型中，粒子碰撞還需有足夠能量與合適方向，才可能反應。活化能 E_a 可理解為沿反應路徑需跨越的能量障礙。對符合 Arrhenius 模型且 E_a > 0 的反應，k = A exp(−E_a / RT)；在其他條件大致不變下，升溫會增加能越過障礙的粒子比例，通常使速率常數 k 變大。式中的 T 必須用絕對溫度 K，不能直接代攝氏溫度。',
    keywords: ['反應速率', '反應速度', '速率', '溫度', '升溫', '碰撞', '活化能', 'Arrhenius', '變快', '反應快慢'],
  },
  {
    id: 'reaction-rate-2', topic: 'reaction-rate', title: '學伴教材｜粒子碰撞與反應快慢', chapter: '第 6 章・催化劑提供另一條路', page: 'p. 63',
    content: '催化劑提供另一條活化能較低的反應路徑，因此在相同溫度下，有較多粒子可以有效反應。催化劑可以參與反應步驟，但在整體循環中再生；不能簡化為「完全不參與反應」。它不改變反應物與生成物之間的能量差，也不會憑空提供能量。對可逆反應，催化劑加快到達平衡，但不改變同溫下的平衡常數。',
    keywords: ['反應速率', '反應速度', '速率', '催化劑', '觸媒', '活化能', '能量', '變快', '路徑'],
  },
  {
    id: 'reaction-rate-3', topic: 'reaction-rate', title: '學伴教材｜粒子碰撞與反應快慢', chapter: '第 6 章・濃度與接觸表面', page: 'p. 64',
    content: '其他條件相同時，提高反應物濃度常可增加碰撞機會，但速率與濃度的實際關係需由速率定律判定。例如若 v = k[A]，將 [A] 加倍使速率加倍；若對 A 為零級，改變 [A] 不會產生這種效果。因此「濃度加倍，速率一定加倍」不成立。對固體與液體的表面反應，把相同質量的固體切成較小顆粒通常會增加總接觸面積，使反應加快；前提是反應受可接觸表面影響，其他條件相同。',
    keywords: ['反應速率', '反應速度', '速率', '濃度', '加倍', '表面積', '接觸面積', '粉末', '顆粒', '切碎', '固體', '變快'],
  },
]

export const learningScenarios: LearningScenario[] = [
  {
    id: 'newton', subject: '物理', title: '牛頓力學', subtitle: '有受力，就一定會加速嗎？',
    question: '牛頓力學怎麼解釋：物體受力了，為什麼不一定會加速？',
    keywords: ['牛頓力學', '牛頓', '牛顿', '牛顿力学', '牛頓第二定律', '第二運動定律', '第一運動定律', '第三運動定律', '第一定律', '第二定律', '第三定律', '合力', '慣性', '加速度'],
    summary: '先選定一個物體，再把作用在它身上的力合起來。決定速度如何改變的是「合力」，不是有沒有任何一個力。',
    formula: 'ΣF = ma', formulaNote: '適用於慣性參考系、質量固定的物體。ΣF 是合外力；a 是加速度。',
    steps: [
      { title: '先圈出你正在觀察的物體', body: '以桌上的書為例，只列出作用在「書」上的力：向下的重力、向上的桌面支持力。', sourceIds: ['newton-1'] },
      { title: '把力的方向也算進去', body: '書靜止時，兩個力大小相等、方向相反，合力為零，所以加速度為零。受到兩個力，仍然可以不加速。', sourceIds: ['newton-1'] },
      { title: '分清楚「保持速度」與「改變速度」', body: '合力為零的物體也可能持續等速度直線運動。公車煞車時，人原本的速度不會自行消失，需要扶手或安全帶提供減速的力。', sourceIds: ['newton-2'] },
    ],
    analogy: '想像兩個人從相反方向、用一樣大的力拉同一個箱子。每個人都很用力，但箱子受到的合力仍可能是零。',
    misconception: '「作用力與反作用力會抵消，所以物體不會動」不對：那一對力作用在不同物體上。',
    sourceIds: ['newton-1', 'newton-2', 'newton-3'],
    practice: { question: '箱子正以等速度直線前進，它受到的合外力是多少？', options: ['一定向前，才能維持運動', '為零，因為速度沒有改變', '一定向後，因為有摩擦'], answerIndex: 1, explanation: '等速度直線運動代表加速度為零，因此合力為零；推力可以剛好與摩擦力平衡。' },
    followUps: [
      {
        question: '為什麼公車急煞時，人會往前傾？', keywords: ['公車', '急煞', '煞車', '往前傾', '前傾', '安全帶', '慣性', '第一定律', '乘客', '身體', '人'],
        title: '身體保留原本的速度', summary: '以地面為參考，車子先減速，身體還傾向保持原本的運動，因此相對車廂向前移動。',
        steps: [
          { title: '煞車前，人和車都向前', body: '你和公車原本具有接近相同的向前速度。', sourceIds: ['newton-2'] },
          { title: '讓身體減速需要外力', body: '車子減速不會讓身體的速度自動消失。扶手或安全帶提供外力，使身體跟著減速。', sourceIds: ['newton-2'] },
          { title: '別把慣性當成一個推力', body: '慣性是維持原本運動狀態的性質；在地面參考系中，並沒有因此多出一股向前推你的「慣性力」。', sourceIds: ['newton-2'] },
        ], sourceIds: ['newton-2'],
      },
      {
        question: '作用力和反作用力，為什麼不會互相抵消？', keywords: ['作用力和反作用力', '作用力與反作用力', '作用力', '反作用力', '第三定律', '推牆', '互相抵消', '抵消', '不同物體'],
        title: '先看每個力作用在哪裡', summary: '作用力與反作用力分別作用在兩個物體上；分析單一物體的合力時，它們不會一起列進去。',
        steps: [
          { title: '用推牆辨認一對力', body: '手對牆施力，牆也對手施力；兩力大小相等、方向相反。', sourceIds: ['newton-3'] },
          { title: '只畫手的受力圖', body: '「牆推手」作用在手上；「手推牆」作用在牆上，所以不能在手的受力圖中把它們抵消。', sourceIds: ['newton-3'] },
        ], sourceIds: ['newton-3'],
      },
      {
        question: '持續推箱子卻只保持等速，推力去哪裡了？', keywords: ['推箱子', '推力', '箱子', '摩擦力', '摩擦', '等速', '持續推', '推力去哪裡'],
        title: '推力與摩擦力可能剛好平衡', summary: '推力沒有消失；它與反方向的摩擦力相加後，合力可能為零。',
        steps: [
          { title: '分析同一個箱子', body: '向前的推力和向後的摩擦力都作用在箱子上，因此可相加求合力。', sourceIds: ['newton-3'] },
          { title: '合力為零，速度就保持不變', body: '若兩力大小相等、方向相反，箱子可以持續等速度前進。這兩力不是作用力與反作用力的一對。', sourceIds: ['newton-3'] },
        ], sourceIds: ['newton-3'],
      },
    ],
  },
  {
    id: 'thermodynamics', subject: '物理', title: '熱力學第一定律', subtitle: '熱量、溫度、內能，差在哪裡？',
    question: '熱力學怎麼解釋：熱量、溫度和內能有什麼不同？',
    keywords: ['熱力學第一定律', '熱力學', '热力学', '第一定律', '內能', '内能', '熱量', '絕熱', '等溫', '打氣筒'],
    summary: '溫度用來判斷熱平衡與熱傳方向，內能是系統的微觀能量總和，熱量則是因溫差而傳遞的能量。先分清楚三者，能量帳就好算了。',
    formula: 'ΔU = Q − W', formulaNote: 'Q > 0：系統吸熱；W > 0：系統對外做功。忽略整體動能與位能的改變。',
    steps: [
      { title: '先分清楚「狀態」和「傳遞」', body: '溫度和內能描述系統當下的狀態；熱量描述能量因溫度差而跨越邊界的過程。物體儲存的是內能，不能直接說它儲存了多少熱量。', sourceIds: ['thermodynamics-1'] },
      { title: '替系統記一份能量帳', body: '系統吸收 100 J 熱量，再對外做功 40 J，內能改變就是 100 − 40 = 60 J。做功是能量轉移，能量沒有消失。', sourceIds: ['thermodynamics-2'] },
      { title: '沒有吸熱，也可能變熱', body: '快速壓縮氣體可近似沒有熱交換，但外界做功仍使內能增加。對定量理想氣體，這會使溫度升高。', sourceIds: ['thermodynamics-3'] },
    ],
    analogy: '把內能想成帳戶餘額。熱和功是兩種轉帳方式；溫度則不是餘額，所以同溫的一杯水與一桶水不代表有相同的內能。',
    misconception: '「沒有吸熱，溫度就不會上升」不對。外界對系統做功，也可以增加內能。',
    sourceIds: ['thermodynamics-1', 'thermodynamics-2', 'thermodynamics-3'],
    practice: { question: '氣體吸熱 100 J，同時對外做功 40 J，內能怎麼改變？', options: ['增加 140 J', '增加 60 J', '減少 60 J'], answerIndex: 1, explanation: '採用系統對外做功為正：ΔU = Q − W = 100 − 40 = 60 J。' },
    followUps: [
      {
        question: '吸熱 100 J、對外做功 40 J，為什麼內能只增加 60 J？',
        keywords: ['100', '40', '60', '能量收支', '第一定律', '做功', '正負號', '正負', '吸熱'],
        title: '先看能量進出哪個系統', summary: '把氣體圈為系統：100 J 進來，40 J 以做功方式出去，剩下 60 J 成為內能的增加量。',
        steps: [
          { title: '固定正負號的定義', body: '本教材規定吸熱 Q 為正，系統對外做功 W 為正；若是外界對氣體做功，W 就是負值。', sourceIds: ['thermodynamics-2'] },
          { title: '代入第一定律', body: 'ΔU = Q − W = 100 − 40 = 60 J。這是內能的改變量，並不是氣體的全部內能。', sourceIds: ['thermodynamics-2'] },
        ], sourceIds: ['thermodynamics-2'],
      },
      {
        question: '打氣筒沒有加熱，為什麼壓縮氣體還會變熱？', keywords: ['打氣筒', '打氣', '壓縮氣體', '壓縮', '沒有加熱', '變熱', '快速'],
        title: '外界做功也能增加內能', summary: '快速壓縮可近似絕熱；熱量沒有進來，但推活塞的功把能量送進氣體。',
        steps: [
          { title: '把快速壓縮近似為絕熱', body: '過程很快時，氣體來不及與環境交換太多熱量，可取 Q ≈ 0。', sourceIds: ['thermodynamics-3'] },
          { title: '辨認做功的方向', body: '外界壓縮氣體，所以系統對外做功 W < 0，ΔU = −W > 0。對定量理想氣體，內能增加對應溫度上升。', sourceIds: ['thermodynamics-3'] },
        ], sourceIds: ['thermodynamics-3'],
      },
      {
        question: '絕熱和等溫有什麼不同？', keywords: ['絕熱', '等溫', '溫度固定', '溫度不變', '沒有熱交換', '熱交換'],
        title: '絕熱管熱交換，等溫管溫度', summary: '絕熱是 Q = 0；等溫是溫度保持不變。它們是不同的條件。',
        steps: [
          { title: '絕熱不保證溫度不變', body: '絕熱壓縮仍可由做功增加內能，因此定量理想氣體可以升溫。', sourceIds: ['thermodynamics-3'] },
          { title: '等溫反而可能需要吸熱', body: '定量理想氣體等溫膨脹時，ΔU = 0。它向外做多少功，就需吸收相同熱量補回，亦即 Q = W。', sourceIds: ['thermodynamics-3'] },
        ], sourceIds: ['thermodynamics-3'],
      },
    ],
  },
  {
    id: 'entropy', subject: '物理', title: '熵與熱力學第二定律', subtitle: '熵會增加，冰箱為什麼還能製冰？',
    question: '熵增加是什麼意思？為什麼冰箱還能把水變成冰？',
    keywords: ['熱力學第二定律', '第二定律', '熵增加', '熵增', '熵', 'entropy', '孤立系統', '微觀狀態'],
    summary: '熵可從粒子與能量有多少種分配方式來理解。第二定律說的是總熵不減；一個局部系統的熵仍然可以降低。',
    formula: 'ΔS總 = ΔS系統 + ΔS環境 ≥ 0', formulaNote: '把系統與所有相關環境一併納入，視為孤立整體；可逆極限取等號。',
    steps: [
      { title: '先別急著把熵叫作「混亂」', body: '想像粒子可以放在哪裡、能量可以怎麼分配。符合相同巨觀條件的微觀排列越多，對應的熵通常越大。', sourceIds: ['entropy-1'] },
      { title: '把冰箱外面的房間也算進來', body: '水結冰時，水的熵可以降低；冰箱耗電，把熱排到室內。只看冰箱裡面，會漏掉環境的熵變。', sourceIds: ['entropy-2'] },
      { title: '檢查的是總和', body: '把水、冰箱與所有相關環境一起計算，總熵仍不減。局部形成較有序的狀態，並不違反第二定律。', sourceIds: ['entropy-2'] },
    ],
    analogy: '移除隔板後，兩種不同的理想氣體容易混在一起，因為「混合」的微觀排列方式遠多於「各待一邊」。這是機率與狀態數，不是粒子偏愛混亂。',
    misconception: '「任何地方的熵都只能增加」不對。與環境交換能量或物質的系統，自己的熵可能減少。',
    sourceIds: ['entropy-1', 'entropy-2', 'entropy-3'],
    practice: { question: '冰箱中的水結冰、熵降低，是否違反第二定律？', options: ['會，任何物體的熵都不能降低', '不會，要連同環境一起計算總熵', '不會，因為冰箱讓總熵消失'], answerIndex: 1, explanation: '冰箱耗電並向環境排熱；局部熵可以降低，但計入所有相關環境後，總熵仍不減。' },
    followUps: [
      {
        question: '冰箱讓水結冰，環境付出了什麼代價？', keywords: ['冰箱', '結冰', '水變成冰', '製冰', '環境', '代價', '耗電', '排熱'],
        title: '冰箱用電功，把熱移到室內', summary: '結冰造成的局部熵減，必須連同冰箱耗電、向室內散熱的過程一起看。',
        steps: [
          { title: '低溫的熱不會自行流向高溫', body: '冰箱需要外界輸入電功，才能把低溫空間的熱搬到較高溫的室內。', sourceIds: ['entropy-2'] },
          { title: '排出的熱包含輸入的功', body: '室內收到的熱包含冰箱移出的熱與輸入的功；計入整個過程，總熵不減。', sourceIds: ['entropy-2'] },
        ], sourceIds: ['entropy-2'],
      },
      {
        question: '兩種氣體混合，為什麼熵會增加？', keywords: ['兩種氣體', '氣體', '混合', '隔板', '擴散', '排列', '分開'],
        title: '混合後，可及的排列方式更多', summary: '對同溫同壓的兩種不同理想氣體，移除隔板後，每種氣體可分布的空間都變大。',
        steps: [
          { title: '比較可用的空間', body: '原本每種氣體只在容器的一側，移除隔板後，兩種氣體都可以分布在整個容器。', sourceIds: ['entropy-3'] },
          { title: '用微觀狀態數理解方向', body: '混合的微觀排列遠多於完全分開的排列，所以自發混合對應熵增加。此例限定不同種類的理想氣體。', sourceIds: ['entropy-3'] },
        ], sourceIds: ['entropy-3'],
      },
      {
        question: '是不是每個系統的熵都只能增加？', keywords: ['每個系統', '所有系統', '任何系統', '只能增加', '一定增加', '一定會增加', '熵減少', '熵降低', '局部', '孤立系統', '總熵'],
        title: '先確認系統有沒有和外界交換', summary: '第二定律限制孤立整體的總熵；有交換的局部系統可以把熵傳到環境，讓自己的熵降低。',
        steps: [
          { title: '孤立系統：看自身的總熵', body: '沒有與外界交換能量或物質的孤立系統，在自發過程中總熵不減。', sourceIds: ['entropy-1'] },
          { title: '局部系統：也要納入環境', body: '若系統會交換能量或物質，就不能只憑它自身的熵減，斷言違反第二定律。', sourceIds: ['entropy-1'] },
        ], sourceIds: ['entropy-1'],
      },
    ],
  },
  {
    id: 'equilibrium', subject: '化學', title: '化學動態平衡', subtitle: '看起來沒變，反應其實沒有停',
    question: '化學平衡時，反應還在進行嗎？為什麼濃度不再改變？',
    keywords: ['化學平衡', '化学平衡', '動態平衡', '平衡常數', '平衡', '勒沙特列', '可逆反應'],
    summary: '平衡像兩邊流量相同的交換：正反應與逆反應一樣快，所以濃度保持穩定，但微觀反應持續進行。',
    formula: 'v正 = v逆', formulaNote: '平衡時兩個方向的反應速率相等；不代表反應物和生成物的濃度相等。',
    steps: [
      { title: '同時想像兩個方向', body: '對可逆反應 A ⇌ B，A 轉成 B 的同時，B 也可能轉回 A。封閉系統在適當條件下可達到動態平衡。', sourceIds: ['equilibrium-1'] },
      { title: '濃度不變，是因為一進一出剛好相同', body: '達到平衡時，正逆反應速率相等，因此巨觀濃度不再改變。這不要求 A、B 的濃度一樣。', sourceIds: ['equilibrium-1'] },
      { title: '分清楚「到得多快」和「最後比例」', body: '固定溫度下，平衡比例受平衡常數約束。催化劑讓反應更快達到同一平衡，但不改變平衡常數。', sourceIds: ['equilibrium-2', 'equilibrium-3'] },
    ],
    analogy: '想像兩個房間每分鐘各有 3 個人走到對面。房間裡的人數可以一直不變，但人仍在移動；兩間房的人數也不必相等。',
    misconception: '「化學平衡表示反應停止」不對。停止改變的是巨觀濃度，正反應與逆反應仍在進行。',
    sourceIds: ['equilibrium-1', 'equilibrium-2', 'equilibrium-3'],
    practice: { question: '已達平衡的系統加入催化劑，在溫度不變時會如何？', options: ['平衡往生成物方向移動', '平衡常數變大', '平衡組成不變，正逆反應都加快'], answerIndex: 2, explanation: '催化劑改變到達平衡的速率，不改變同一溫度下的平衡常數與平衡組成。' },
    followUps: [
      {
        question: '加入催化劑，平衡會往生成物方向移動嗎？', keywords: ['催化劑', '觸媒', '往生成物', '往右', '往左', '平衡組成', '平衡常數', '生成物變多'],
        title: '催化劑改變速度，不改變平衡位置', summary: '在相同溫度下，催化劑同時加快正逆反應，使系統更快到達原本的平衡。',
        steps: [
          { title: '兩個方向都受到影響', body: '催化劑提供另一條較低活化能的反應路徑，並非只加速生成物形成的方向。', sourceIds: ['equilibrium-3'] },
          { title: '最後比例仍由原來的平衡常數決定', body: '若系統已經平衡，加入催化劑不會讓平衡往右或往左，也不會增加平衡時的生成物比例。', sourceIds: ['equilibrium-3'] },
        ], sourceIds: ['equilibrium-3'],
      },
      {
        question: '對放熱反應升溫，平衡會往哪邊移動？', keywords: ['放熱', '吸熱', '升溫', '降溫', '改變溫度', '溫度'],
        title: '升溫有利於吸熱的方向', summary: '若正反應放熱，升溫會使平衡朝吸熱的逆反應方向移動，對應的平衡常數減小。',
        steps: [
          { title: '先辨認哪一邊吸熱', body: '當 A → B 放熱時，B → A 就是吸熱的逆反應。', sourceIds: ['equilibrium-2'] },
          { title: '升溫也會改變平衡常數', body: '其他條件合適時，升溫使這個放熱正反應的 K 減小，因此平衡朝反應物方向移動。不能把「升溫通常加速反應」當成「一定得到更多生成物」。', sourceIds: ['equilibrium-2'] },
        ], sourceIds: ['equilibrium-2'],
      },
      {
        question: '在 A ⇌ B 的平衡中加入 A，會發生什麼事？', keywords: ['加入A', '增加A', '加入反應物', '增加反應物', '改變濃度', '濃度', '[A]', 'A⇌B'],
        title: '先改變當下比例，再重新達到平衡', summary: '固定溫度下加入 A，當下的 [B]/[A] 降低，系統暫時淨生成 B，直到比例重新符合 K。',
        steps: [
          { title: '平衡常數並沒有跟著改變', body: '在這個理想稀溶液的簡化反應中，固定溫度下 K_c = [B]_eq / [A]_eq。', sourceIds: ['equilibrium-2'] },
          { title: '加入 A 使比例偏離平衡', body: '加入 A 後，[B]/[A] 小於 K_c，淨反應往 B 進行以恢復平衡；這不代表 A 最後會被完全耗盡。', sourceIds: ['equilibrium-2'] },
        ], sourceIds: ['equilibrium-2'],
      },
    ],
  },
  {
    id: 'bonding', subject: '化學', title: '化學鍵與氫鍵', subtitle: '水沸騰，斷掉的到底是什麼？',
    question: '化學鍵和氫鍵有什麼不同？為什麼水沸騰不會變成氫氣、氧氣？',
    keywords: ['化學鍵', '化学键', '共價鍵', '共价键', '氫鍵', '氢键', '離子鍵', '水分子', '食鹽', '水合'],
    summary: '先分清楚水分子「裡面」和「彼此之間」。沸騰主要克服分子間的吸引，水分子內的共價鍵仍維持，所以水蒸氣還是 H₂O。',
    formula: 'H₂O(l) → H₂O(g)', formulaNote: '沸騰是相態改變；這個式子沒有把 H₂O 分解成 H₂ 和 O₂。',
    steps: [
      { title: '放大到一個水分子裡面', body: '氧與氫透過共享電子形成 O–H 共價鍵，連成一個水分子。', sourceIds: ['bonding-1'] },
      { title: '再看不同水分子之間', body: '水分子具有極性，一個分子的氫端可與另一個分子的氧端形成氫鍵。這和分子內的 O–H 共價鍵不同。', sourceIds: ['bonding-1'] },
      { title: '沸騰讓分子分開，沒有拆散每個分子', body: '一般沸騰主要克服分子間吸引，水分子進入氣相；分子內的 O–H 共價鍵仍在，所以不是生成氫氣與氧氣的分解反應。', sourceIds: ['bonding-2'] },
    ],
    analogy: '把每個水分子想成牽緊手的一小組人。沸騰像不同小組彼此散開，並沒有把每一組內部牽著的手拆開。這個比喻只用來區分作用的層級。',
    misconception: '「水沸騰會把 O–H 共價鍵切斷」不對。一般沸騰是物理變化，水蒸氣主要仍由水分子構成。',
    sourceIds: ['bonding-1', 'bonding-2'],
    practice: { question: '水沸騰成為水蒸氣時，下列哪個說法正確？', options: ['H₂O 分解成氫氣和氧氣', '水分子間的吸引被克服，H₂O 分子仍維持', '所有共價鍵都轉成氫鍵'], answerIndex: 1, explanation: '沸騰改變相態，主要克服分子間的吸引；分子內的 O–H 共價鍵仍維持。' },
    followUps: [
      {
        question: '水沸騰時，是氫鍵斷開還是共價鍵斷開？', keywords: ['沸騰', '煮沸', '水蒸氣', '斷開', '斷裂', '氫氣', '氧氣', '分解'],
        title: '沸騰主要克服分子間的吸引', summary: '一般條件下，水分子內的 O–H 共價鍵仍維持；水蒸氣主要仍是 H₂O。',
        steps: [
          { title: '氫鍵本來就會動態形成與斷開', body: '液態水的分子間氫鍵不是永久固定的連接。加熱沸騰讓分子克服吸引、進入氣相。', sourceIds: ['bonding-2'] },
          { title: '化學分解是另一個過程', body: '把水變成氫氣與氧氣需要涉及化學鍵重組的化學反應，例如電解；一般沸騰並不等於電解。', sourceIds: ['bonding-2'] },
        ], sourceIds: ['bonding-2'],
      },
      {
        question: '氫鍵和共價鍵，位置與形成方式有什麼不同？', keywords: ['氫鍵和共價鍵', '氫鍵與共價鍵', '共價鍵', '氫鍵', '分子間', '分子內', '電子', '形成方式', '位置', '差別'],
        title: '用水分子比較兩種作用', summary: '水分子內的 O–H 共價鍵涉及共享電子；液態水的分子間氫鍵則與水分子的極性有關。',
        steps: [
          { title: '共價鍵連接一個水分子內的原子', body: '氧與氫共享電子對，形成分子內的 O–H 共價鍵。', sourceIds: ['bonding-1'] },
          { title: '液態水的氫鍵連結不同水分子', body: '水的氧端帶部分負電、氫端帶部分正電，可在不同水分子間形成氫鍵。一般而言，氫鍵也可能出現在合適分子的內部。', sourceIds: ['bonding-1'] },
        ], sourceIds: ['bonding-1'],
      },
      {
        question: '食鹽溶於水時，是變成新的水分子嗎？', keywords: ['食鹽', '鹽', '溶於水', '溶解', '水合', '離子', '氯化鈉', 'NaCl', '新的水分子'],
        title: '離子離開晶格，被水分子包圍', summary: '食鹽溶解時形成水合的 Na⁺ 和 Cl⁻，不是把鹽變成新的水分子。',
        steps: [
          { title: '先看食鹽原本的結構', body: '食鹽固體是正、負離子交錯的晶格，不是一顆顆獨立 NaCl 分子的集合。', sourceIds: ['bonding-3'] },
          { title: '極性水分子圍住離子', body: '水的氧端較靠近 Na⁺，氫端較靠近 Cl⁻，形成水合離子。這主要是離子－偶極作用；並非所有離子化合物都能大量溶於水。', sourceIds: ['bonding-3'] },
        ], sourceIds: ['bonding-3'],
      },
    ],
  },
  {
    id: 'reaction-rate', subject: '化學', title: '反應速率與活化能', subtitle: '溫度只高一點，反應就快很多？',
    question: '反應速率怎麼決定？為什麼溫度升高，反應通常會變快？',
    keywords: ['反應速率', '反应速率', '反應速度', '反應快慢', '反應變快', '活化能', '碰撞理論', '有效碰撞', 'Arrhenius', '表面積'],
    summary: '粒子碰到彼此還不夠，通常還需要足夠能量與合適方向。升溫讓更多粒子有機會跨過活化能障礙，因此反應通常加快。',
    formula: 'k = A · exp(−Eₐ / RT)', formulaNote: 'Arrhenius 模型：k 是速率常數、Eₐ 是活化能；T 必須用絕對溫度 K。',
    steps: [
      { title: '不是每次碰撞都會反應', body: '把反應想成跨越一個能量障礙。粒子需要足夠能量與合適碰撞方向，才有機會產生反應。', sourceIds: ['reaction-rate-1'] },
      { title: '升溫讓更多粒子跨過門檻', body: '在符合此模型、活化能為正且其他條件大致不變時，溫度升高會提高能有效反應的粒子比例，使速率常數變大。', sourceIds: ['reaction-rate-1'] },
      { title: '催化劑則是提供較低的門檻', body: '催化劑提供較低活化能的另一條反應路徑。它改變反應快慢，沒有改變反應物與生成物之間的能量差。', sourceIds: ['reaction-rate-2'] },
    ],
    analogy: '像一群人要翻越山丘：升溫好比更多人具備越過山丘的能力；催化劑好比提供較低的山路。這是理解能量障礙的比喻，實際粒子不是人在行走。',
    misconception: '「濃度加倍，反應一定快兩倍」不對。實際關係要看反應的速率定律，不能只靠碰撞直覺推定。',
    sourceIds: ['reaction-rate-1', 'reaction-rate-2', 'reaction-rate-3'],
    practice: { question: '催化劑為什麼通常能讓反應變快？', options: ['提供活化能較低的另一條反應路徑', '憑空增加反應釋放的總能量', '把所有粒子都加熱到同一高溫'], answerIndex: 0, explanation: '催化劑提供另一條較低活化能的路徑，不會改變反應物與生成物的能量差。' },
    followUps: [
      {
        question: '催化劑為什麼能降低活化能？它會被用完嗎？', keywords: ['催化劑', '觸媒', '降低活化能', '用完', '消耗', '參與反應', '路徑'],
        title: '催化劑參與步驟，並在循環中再生', summary: '催化劑提供另一套活化能較低的反應步驟；它可以參與反應，但在整體催化循環中再生。',
        steps: [
          { title: '更換反應路徑', body: '在同樣溫度下，較低的能量障礙讓更多粒子可以有效反應；催化劑不是憑空提供能量。', sourceIds: ['reaction-rate-2'] },
          { title: '區分參與與淨消耗', body: '催化劑可在中間步驟被改變，再於後續步驟再生。因此不能說它完全不參與反應。', sourceIds: ['reaction-rate-2'] },
        ], sourceIds: ['reaction-rate-2'],
      },
      {
        question: '反應物濃度加倍，反應速率一定也加倍嗎？', keywords: ['濃度', '加倍', '兩倍', '二倍', '速率定律', '零級', '一級'],
        title: '要先知道反應的速率定律', summary: '提高濃度常增加碰撞機會，但速率增加多少，取決於這個反應的速率定律。',
        steps: [
          { title: '一級反應的例子', body: '若 v = k[A]，在其他條件相同時，把 [A] 加倍，速率就加倍。', sourceIds: ['reaction-rate-3'] },
          { title: '換個反應，比例可能不同', body: '若對 A 為零級，增加 [A] 就不會出現相同效果。因此不能把「濃度加倍」直接等同「速率加倍」。', sourceIds: ['reaction-rate-3'] },
        ], sourceIds: ['reaction-rate-3'],
      },
      {
        question: '相同質量的固體，磨成粉末為什麼常反應更快？', keywords: ['粉末', '表面積', '接觸面積', '顆粒', '切碎', '磨成', '固體', '相同質量'],
        title: '更多表面可以同時接觸反應物', summary: '對受接觸表面影響的反應，相同質量的固體分成較小顆粒，總接觸面積通常更大。',
        steps: [
          { title: '看能接觸到的表面', body: '固體與液體的反應常發生在接觸處；固體內部未暴露的部分，不能直接和外部液體接觸。', sourceIds: ['reaction-rate-3'] },
          { title: '保持其他條件一致', body: '把固體切小或磨成粉末，可能增加可反應的接觸面積，使反應加快。這個結論需要相同質量、其他條件相同，且反應受表面影響。', sourceIds: ['reaction-rate-3'] },
        ], sourceIds: ['reaction-rate-3'],
      },
    ],
  },
]

const normalize = (value: string): string => value.normalize('NFKC').toLocaleLowerCase().replace(/[\s\p{P}\p{S}]/gu, '')

/** The score is a lexical ranking aid, never a semantic similarity percentage. */
const keywordScore = (query: string, keywords: string[]): number => {
  const normalizedQuery = normalize(query)
  const latinTokens: string[] = query.normalize('NFKC').toLowerCase().match(/[a-z]+|\d+(?:\.\d+)?/g) ?? []
  return [...new Set(keywords.map(normalize))].reduce((score, keyword) => (
    keyword && (/^(?:[a-z]+|\d+)$/.test(keyword) ? latinTokens.includes(keyword) : normalizedQuery.includes(keyword))
      ? score + keyword.length ** 2 : score
  ), 0)
}

export function getLearningScenario(id: string | null): LearningScenario | undefined {
  return learningScenarios.find((scenario) => scenario.id === id)
}

export function resolveLearningScenario(question: string): LearningScenario | undefined {
  const candidates = learningScenarios
    .map((scenario) => ({ scenario, score: keywordScore(question, [...scenario.keywords, scenario.title]) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
  // Ambiguous phrases (for example, a catalyst with no stated subject) should
  // preserve the current topic instead of silently switching to an arbitrary one.
  if (candidates.length && candidates[0].score !== candidates[1]?.score) return candidates[0].scenario
  return undefined
}

export function retrieveMaterials(query: string, topic?: LearningTopic): MaterialChunk[] {
  const normalizedQuery = normalize(query)
  if (!normalizedQuery) return []
  return materialChunks
    .filter((chunk) => !topic || chunk.topic === topic)
    .map((chunk, index) => ({
      chunk,
      index,
      score: keywordScore(query, chunk.keywords)
        + (normalizedQuery.includes(normalize(chunk.chapter)) ? 20 : 0),
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ chunk }) => chunk)
}

// Restrict authored answers to supported question wording. Merely mentioning a
// topic inside a more specific unsupported question must not produce its overview.
const questionWords = [
  '可不可以', '可以幫我', '能不能', '可否', '可以', '幫我', '請問', '請', '想了解', '想知道',
  '不太理解', '不太懂', '看不懂', '不理解', '不懂', '教我', '解釋一下', '解釋', '說明一下', '說明',
  '介紹一下', '介紹', '複習', '理解', '概念', '的例子', '生活中的例子', '生活例子', '舉例',
  '是什麼意思', '什麼意思', '是什麼', '為什麼', '怎麼理解', '怎麼', '如何', '有什麼', '什麼',
  '是不是', '是否', '會不會', '不會', '會', '為何', '有何', '到底', '真的', '一定', '通常',
  '不同', '差異', '差別', '關係', '互相', '彼此', '相同', '一樣', '之間', '之後', '的時候',
  '時', '現在', '還', '也', '就', '只', '都', '能', '讓', '把', '被', '對', '和', '與', '跟',
  '在', '中', '有', '沒有', '不', '是', '的', '地', '得', '了', '嗎', '呢', '啊', '我', '它',
]

const overviewPhrases: Partial<Record<LearningTopic, string[]>> = {
  newton: ['受力', '不一定會加速', '加速', '物體', '有力', '速度改變'],
  thermodynamics: ['溫度', '區別'],
  entropy: ['混亂程度', '混亂', '分配方式'],
  equilibrium: ['反應', '進行', '停止', '濃度不再改變', '濃度不變', '濃度相等'],
  bonding: ['分子間的吸引', '物理變化'],
  'reaction-rate': ['溫度升高', '溫度', '升溫', '變快', '決定'],
}

function coversQuestion(query: string, keywords: string[]): boolean {
  let remaining = normalize(query)
  const phrases = [...keywords, ...questionWords].map(normalize).filter(Boolean).sort((a, b) => b.length - a.length)
  for (const phrase of phrases) remaining = remaining.split(phrase).join('')
  return remaining.length === 0
}

export function answerLearningQuestion(query: string, context: LearningTopic): {
  kind: 'answer' | 'unsupported'
  title: string
  summary: string
  steps: LearningStep[]
  sources: MaterialChunk[]
  topic: LearningTopic
} {
  const scenario = resolveLearningScenario(query) ?? getLearningScenario(context) ?? learningScenarios[0]
  const normalizedQuery = normalize(query)
  const topicKeywords = [...scenario.keywords, scenario.title]
  const exactOverview = normalizedQuery === normalize(scenario.question)
  const namedOverview = keywordScore(query, [scenario.title]) > 0 && coversQuestion(query, [scenario.title])
  const overview = exactOverview || (
    keywordScore(query, topicKeywords) > 0
    && coversQuestion(query, [...topicKeywords, ...(overviewPhrases[scenario.id] ?? [])])
  )
  const followUp = scenario.followUps
    .map((item) => ({ item, exact: normalize(item.question) === normalizedQuery, score: keywordScore(query, item.keywords) }))
    .filter(({ item, exact, score }) => exact || (score > 0 && coversQuestion(query, [...item.keywords, ...topicKeywords])))
    .sort((a, b) => Number(b.exact) - Number(a.exact) || b.score - a.score)[0]?.item

  const answer = exactOverview || namedOverview ? scenario : followUp ?? (overview ? scenario : undefined)
  // Citations may only come from the locally retrieved corpus. The canonical
  // question expands recognized paraphrases with the authored intent's vocabulary.
  // This keeps aliases useful without pretending to perform semantic retrieval.
  const sources = answer
    ? retrieveMaterials(`${query} ${answer.question}`, scenario.id).filter((chunk) => answer.sourceIds.includes(chunk.id))
    : []
  if (!answer || sources.length !== answer.sourceIds.length) {
    return {
      kind: 'unsupported', topic: scenario.id, title: '目前還沒有相關教材',
      summary: '我還沒有找到足以回答這個問題的教材。試著補充想了解的概念，或從下方選一個相關問題。',
      steps: [], sources: [],
    }
  }
  return { kind: 'answer', topic: scenario.id, title: answer.title, summary: answer.summary, steps: answer.steps, sources }
}

// Logo da Corpo Atlético: "CORPO ATLÉTICO." com ponto laranja. As cores seguem o tema (claro/escuro).
// Letras C e A da fonte Barlow Condensed (negrito) em desenho, para o ícone funcionar sem a fonte carregada.
const LETRAS_CA = 'M34 -189V-513Q34 -602 88 -655Q143 -708 233 -708Q324 -708 378 -655Q433 -602 433 -513V-502Q433 -497 430 -494Q426 -490 421 -490L304 -485Q292 -485 292 -496V-522Q292 -551 276 -569Q260 -587 233 -587Q207 -587 191 -569Q175 -551 175 -522V-177Q175 -148 191 -130Q207 -113 233 -113Q260 -113 276 -130Q292 -148 292 -177V-204Q292 -209 296 -212Q299 -216 304 -216L421 -211Q426 -211 430 -208Q433 -204 433 -199V-189Q433 -99 378 -46Q323 8 233 8Q143 8 88 -46Q34 -99 34 -189Z M789 -11 773 -107Q773 -112 767 -112H640Q634 -112 634 -107L618 -11Q617 0 605 0H488Q475 0 478 -13L625 -689Q627 -700 638 -700H773Q784 -700 786 -689L932 -13L933 -9Q933 0 922 0H802Q790 0 789 -11ZM658 -221H748Q753 -221 752 -226L705 -499Q704 -502 702 -502Q700 -502 699 -499L654 -226Q654 -221 658 -221Z'

// Ícone: quadrado escuro com "CA" branco e o ponto laranja (o mesmo do app no celular).
export function SimboloCA({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" style={{ flex: 'none' }}>
      <rect width="100" height="100" rx="22" fill="#161618" />
      <path transform="translate(15.5 70) scale(0.0571)" fill="#fff" d={LETRAS_CA} />
      <circle cx="78.5" cy="64" r="6" fill="#fc4c02" />
    </svg>
  )
}

export default function Logo({ sub, grande = false }) {
  return (
    <div className="logo" style={{ marginBottom: 18 }}>
      <div aria-label="Corpo Atlético" style={{ fontFamily: 'var(--display)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.02em', lineHeight: 1, fontSize: grande ? 44 : 30 }}>
        Corpo Atlético<span style={{ color: 'var(--accent)' }}>.</span>
      </div>
      {sub && <small style={{ display: 'block', fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)', marginTop: 8 }}>{sub}</small>}
    </div>
  )
}

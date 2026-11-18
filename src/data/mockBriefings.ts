import { GlossaryItem } from '../types/briefing';

export const USER_AVATAR_URL =
  'https://lh3.googleusercontent.com/aida/ALJJyrA3i8RlM5iQaSaQv398vZuCkNn-kkRsnsj4Bsla_eLdDMWXcfJomb7jBasvqaDnyjcMb0Iy2fsZYkWX2Fl5rNOkp-zDEVwBkEyRSnCXSaLanp89idBZWXX6czfb9feMw3VdLHDuvOg1fbmdl7JARB2dFqReGZK3FaOn5NMWREygpPojvBuOxZMMn1jOhSlbqXaNiqtSDZGJ7XJZzdDgjqT8jGEPgTQDKN-sINfQCsG-';

export const GLOSSARY_HINTS: GlossaryItem[] = [
  {
    term: '전력거래소(KPX)란?',
    subtitle: '취업 및 시험 대비 핵심 공기업',
    description:
      '대한민국 전력시장의 운영과 전력계통의 관제를 총괄하는 공공기관입니다. 발전소 전력 입찰, SMP 결정, 송배전 계통 안정성 확보를 책임집니다.',
    badge: 'KPX · 계통운영',
  },
  {
    term: '계통한계가격(SMP)이란?',
    subtitle: '전력도매시장 정산 핵심 지표',
    description:
      '거래시간별로 일반발전기 중 변동비가 가장 높은 발전기의 변동비로 결정되는 전력 도매 단가(원/kWh)로, 한전의 전력구입비와 발전사 수익성을 좌우합니다.',
    badge: '시장가격 · 정산',
  },
  {
    term: '초고압직류송전(HVDC)이란?',
    subtitle: '에너지고속도로 핵심 송전 기술',
    description:
      '발전소에서 생산된 교류(AC) 전력을 직류(DC)로 변환해 송전한 뒤 수전단에서 다시 교류로 바꾸는 기술로, 장거리·해저 송전 손실을 대폭 줄입니다.',
    badge: '송배전 · 한전',
  },
];

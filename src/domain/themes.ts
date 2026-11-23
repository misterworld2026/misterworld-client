// 고객 화면 테마 소개 문구 — 디자인 캔버스 Main/Themes와 분석산출물의 테마별 특징 그대로.
import type { Theme } from './rules';

export interface ThemeContent {
  theme: Theme;
  name: string;
  intro: string;
  points: [string, string, string];
  grades: string;
  /** public 폴더의 테마 대표 이미지 경로 */
  image: string;
}

export const THEME_CONTENT: ThemeContent[] = [
  {
    theme: '허니문',
    name: '허니문 낭만 투어',
    intro: '둘만을 위해 꾸민 공간에서 시작하는 낭만 여행입니다.',
    points: ['2인 전용 로맨틱 스페셜 룸 데코레이션', '커플 기념티 제공', '2인 전용 고급차량 서비스'],
    grades: '그랜드 · 프리미엄',
    image: '/honeymoon.jpeg',
  },
  {
    theme: '효도',
    name: '효도 힐링 투어',
    intro: '부모님의 몸과 마음이 편안해지는 힐링 여행입니다.',
    points: ['고품격 안마·지압 서비스', '건강 인삼 기념품 제공', '10인 승합 고급차량 서비스'],
    grades: '그랜드 · 프리미엄',
    image: '/healing.jpeg',
  },
  {
    theme: '골프',
    name: '골프 챌린지 투어',
    intro: '유명 골프 리조트 분위기 속에서 즐기는 라운드 여행입니다.',
    points: ['유명 골프 리조트 테마 연출', '골프 액세서리·골프공 제공', '10인 승합 고급차량 서비스'],
    grades: '클래식 · 그랜드 · 프리미엄',
    image: '/golf.jpeg',
  },
  {
    theme: '트레킹',
    name: '아웃도어 트레킹 투어',
    intro: '산과 길을 따라 걷는 어드벤처 여행입니다.',
    points: ['트레킹·산악 테마 어드벤처 연출', '아웃도어 기념품 스카프 제공', '10인 승합 고급차량 서비스'],
    grades: '클래식 · 그랜드 · 프리미엄',
    image: '/trekking.jpg',
  },
];

/** image: public 폴더의 후기 배경 사진, position: 가로로 긴 영역에 맞춰 잘릴 때 남길 세로 위치 */
export const REVIEWS = [
  {
    text: '방에 들어서자마자 꾸며진 장식에 둘 다 한참을 웃었습니다. 준비할 것이 없어서 여행에만 집중할 수 있었어요.',
    by: '허니문 낭만 투어',
    image: '/honeymoon_review.jpg',
    position: 'center 45%',
  },
  {
    text: '부모님이 안마 서비스를 가장 좋아하셨습니다. 이동도 편해서 걱정 없이 다녀왔습니다.',
    by: '효도 힐링 투어',
    image: '/masage_review.jpg',
    position: 'center 40%',
  },
  {
    text: '친구들과 같은 차로 이동하며 라운드까지, 일정이 매끄러웠습니다.',
    by: '골프 챌린지 투어',
    image: '/golf_review.jpg',
    position: 'center 65%',
  },
];

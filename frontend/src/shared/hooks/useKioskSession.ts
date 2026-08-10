import { useCallback, useMemo, useReducer } from 'react';
import { matchFabrics } from '../lib/colorEngine';
import type { SessionAction, SessionState, StepId } from '../lib/types';

/**
 * Exact 15-step flow from PTRI System Guide Section A — How It Works.
 * 1 HOME → 2 CAMERA GUIDE → 3 LIGHTING CHECK → 4 LIVE SCAN → 5 AI ANALYZING
 * → 6 TOP 20 → 7 CHOOSE TOP → 8 CATEGORY → 9 DESIGN → 10 FABRIC
 * → 11 BACKGROUND → 12 PREVIEW → 13 RECOMMENDATION → 14 GET RESULT → 15 THANK YOU
 */
export const STEPS: StepId[] = [
  'welcome',
  'cameraGuide',
  'lightingCheck',
  'liveScan',
  'analysis',
  'top20',
  'chooseTop',
  'category',
  'design',
  'fabric',
  'background',
  'preview',
  'recommendation',
  'results',
  'thanks',
];

export const STEP_LABELS: Record<StepId, string> = {
  welcome: 'HOME',
  cameraGuide: 'CAMERA GUIDE',
  lightingCheck: 'LIGHTING CHECK',
  liveScan: 'LIVE SCAN',
  analysis: 'AI ANALYZING',
  top20: 'TOP 20 COLORS',
  chooseTop: 'CHOOSE TOP',
  category: 'CHOOSE CATEGORY',
  design: 'CHOOSE DESIGN',
  fabric: 'CHOOSE FABRIC',
  background: 'CHOOSE BACKGROUND',
  preview: 'PREVIEW LOOK',
  recommendation: 'AI RECOMMENDATION',
  results: 'GET YOUR RESULT',
  thanks: 'THANK YOU',
};

const initialState: SessionState = {
  step: 'welcome',
  sessionId: null,
  profile: {
    fullName: 'Guest',
    ageRange: '',
    gender: 'prefer_not',
    email: '',
  },
  captureDataUrl: null,
  lighting: null,
  top20: [],
  selectionMode: 'top5',
  selectedColors: [],
  categoryId: null,
  designId: null,
  backgroundId: 'studio',
  fabricId: null,
  fabricMatches: [],
  staffAlerted: false,
  resultToken: null,
};

function reducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, step: action.step };
    case 'SET_PROFILE':
      return { ...state, profile: { ...state.profile, ...action.profile } };
    case 'SET_SESSION':
      return { ...state, sessionId: action.sessionId };
    case 'SET_CAPTURE':
      return { ...state, captureDataUrl: action.dataUrl };
    case 'SET_LIGHTING':
      return { ...state, lighting: action.lighting };
    case 'SET_TOP20':
      return { ...state, top20: action.top20 };
    case 'SET_SELECTION_MODE':
      return { ...state, selectionMode: action.mode };
    case 'SET_SELECTED_COLORS':
      return {
        ...state,
        selectedColors: action.colors,
        fabricMatches: matchFabrics(action.colors),
      };
    case 'SET_CATEGORY':
      return { ...state, categoryId: action.categoryId, designId: null };
    case 'SET_DESIGN':
      return { ...state, designId: action.designId };
    case 'SET_BACKGROUND':
      return { ...state, backgroundId: action.backgroundId };
    case 'SET_FABRIC':
      return { ...state, fabricId: action.fabricId };
    case 'SET_RESULT_TOKEN':
      return { ...state, resultToken: action.token };
    case 'STAFF_ALERT':
      return { ...state, staffAlerted: true };
    case 'RESET':
      return { ...initialState };
    default:
      return state;
  }
}

export function useKioskSession() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const stepIndex = STEPS.indexOf(state.step);

  const goTo = useCallback((step: StepId) => dispatch({ type: 'SET_STEP', step }), []);

  const next = useCallback(() => {
    const i = STEPS.indexOf(state.step);
    if (i < STEPS.length - 1) dispatch({ type: 'SET_STEP', step: STEPS[i + 1] });
  }, [state.step]);

  const back = useCallback(() => {
    const i = STEPS.indexOf(state.step);
    if (i > 0) dispatch({ type: 'SET_STEP', step: STEPS[i - 1] });
  }, [state.step]);

  const reset = useCallback(() => dispatch({ type: 'RESET' }), []);

  const summary = useMemo(
    () => ({
      name: state.profile.fullName,
      categoryId: state.categoryId,
      designId: state.designId,
      fabric: state.fabricMatches.find((f) => f.id === state.fabricId),
      colors: state.selectedColors,
      backgroundId: state.backgroundId,
    }),
    [state],
  );

  return {
    state,
    dispatch,
    stepIndex,
    totalSteps: STEPS.length,
    stepLabel: STEP_LABELS[state.step],
    goTo,
    next,
    back,
    reset,
    summary,
  };
}

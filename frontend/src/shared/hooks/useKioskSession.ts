import { useCallback, useMemo, useReducer } from 'react';
import { matchFabrics } from '../lib/colorEngine';
import type { SessionAction, SessionState, StepId } from '../lib/types';

/**
 * PTRI kiosk flow. Camera guide + lighting + live scan are one automatic step:
 * the visitor just stands in front of the camera and the face is detected,
 * checked and captured with no manual action.
 */
export const STEPS: StepId[] = [
  'welcome',
  'profile',
  'cameraGuide',
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
  welcome: 'WELCOME',
  profile: 'ABOUT YOU',
  cameraGuide: 'CAMERA GUIDE',
  analysis: 'ANALYZING',
  top20: 'YOUR TOP 20 COLORS',
  chooseTop: 'CHOOSE YOUR TOP COLORS',
  category: 'CHOOSE CATEGORY',
  design: 'SELECT DESIGN',
  fabric: 'SELECT PTRI TEXTILE',
  background: 'CHOOSE BACKGROUND',
  preview: 'PREVIEW YOUR LOOK',
  recommendation: 'AI RECOMMENDATION',
  results: 'GET YOUR RESULT',
  thanks: 'THANK YOU',
};

const initialState: SessionState = {
  step: 'welcome',
  sessionId: null,
  profile: {
    fullName: '',
    ageRange: '',
    gender: '',
    email: '',
  },
  captureDataUrl: null,
  faceBox: null,
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
      return { ...state, captureDataUrl: action.dataUrl, faceBox: action.faceBox };
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

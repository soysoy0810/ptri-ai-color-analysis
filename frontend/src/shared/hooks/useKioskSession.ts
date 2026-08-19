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
  'skinTone',
  'analysis',
  'top20',
  'colorPreview',
  'category',
  'fabric',
  'preview',
  'results',
  'thanks',
];

export const STEP_LABELS: Record<StepId, string> = {
  welcome: 'WELCOME',
  profile: 'ENTER YOUR INFORMATION',
  cameraGuide: 'FACE SCAN',
  skinTone: 'SKIN TONE DETECTION',
  analysis: 'AI PROCESSING & ANALYSIS',
  top20: 'AI COLOR RECOMMENDATION',
  chooseTop: 'CHOOSE YOUR COLOR PALETTE',
  colorPreview: 'PREVIEW ON YOU',
  category: 'CHOOSE YOUR STYLE',
  design: 'CHOOSE YOUR STYLE',
  fabric: 'CHOOSE YOUR TEXTILE & FABRIC',
  accessories: 'ADD-ONS',
  background: 'CHOOSE BACKGROUND',
  preview: 'YOUR AI LOOK',
  recommendation: 'YOUR RESULT',
  results: 'YOUR RESULT',
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
    purpose: 'Personal Use',
  },
  captureDataUrl: null,
  faceBox: null,
  faceLandmarks: null,
  captureWidth: null,
  captureHeight: null,
  portraitLighting: 'neutral',
  lighting: null,
  top20: [],
  selectionMode: 'top5',
  selectedColors: [],
  categoryId: null,
  designId: null,
  backgroundId: 'studio',
  fabricId: null,
  fabricMatches: [],
  selectedAccessories: [],
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
      return {
        ...state,
        captureDataUrl: action.dataUrl,
        faceBox: action.faceBox,
        faceLandmarks: action.faceLandmarks ?? null,
        captureWidth: action.width ?? state.captureWidth,
        captureHeight: action.height ?? state.captureHeight,
      };
    case 'SET_PORTRAIT_LIGHTING':
      return { ...state, portraitLighting: action.lighting };
    case 'SET_LIGHTING':
      return { ...state, lighting: action.lighting };
    case 'SET_TOP20':
      return { ...state, top20: action.top20 };
    case 'SET_SELECTION_MODE':
      return { ...state, selectionMode: action.mode };
    case 'SET_SELECTED_COLORS': {
      const fabricMatches = matchFabrics(action.colors);
      return {
        ...state,
        selectedColors: action.colors,
        fabricMatches,
        fabricId: state.fabricId || fabricMatches[0]?.id || null,
      };
    }
    case 'SET_CATEGORY':
      return { ...state, categoryId: action.categoryId, designId: null };
    case 'SET_DESIGN':
      return { ...state, designId: action.designId };
    case 'SET_BACKGROUND':
      return { ...state, backgroundId: action.backgroundId };
    case 'SET_FABRIC':
      return { ...state, fabricId: action.fabricId };
    case 'TOGGLE_ACCESSORY': {
      const acc = action.accessory;
      const alreadySelected = state.selectedAccessories.includes(acc);
      return {
        ...state,
        selectedAccessories: alreadySelected
          ? state.selectedAccessories.filter((a) => a !== acc)
          : [...state.selectedAccessories, acc],
      };
    }
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

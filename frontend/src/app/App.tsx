import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Shell } from '../shared/ui/Shell';
import { NavButtons } from '../shared/ui/NavButtons';
import { STEPS, useKioskSession } from '../shared/hooks/useKioskSession';
import { api } from '../shared/api/client';
import { setLiveDesigns } from '../shared/lib/catalogStore';
import {
  analyzeSkinTone,
  averageImageColor,
  rankPaletteFromSample,
  setActivePalette,
  type SkinProfile,
} from '../shared/lib/colorEngine';
import { FABRICS } from '../data/catalog';
import { getDesignById } from '../shared/lib/catalogStore';
import type { FaceRegion, LightingInfo, PaletteColor, SelectionMode, StepId } from '../shared/lib/types';
import { WelcomeScreen } from '../features/welcome/WelcomeScreen';
import { ProfileScreen } from '../features/profile/ProfileScreen';
import { AutoScanScreen } from '../features/camera/AutoScanScreen';
import { AnalysisScreen } from '../features/analysis/AnalysisScreen';
import { Top20Screen } from '../features/colors/Top20Screen';
import { ChooseTopScreen } from '../features/colors/ChooseTopScreen';
import { CategoryScreen } from '../features/category/CategoryScreen';
import { DesignScreen } from '../features/design/DesignScreen';
import { FabricScreen } from '../features/fabric/FabricScreen';
import { BackgroundScreen } from '../features/background/BackgroundScreen';
import { PreviewScreen } from '../features/preview/PreviewScreen';
import { RecommendationScreen } from '../features/recommendation/RecommendationScreen';
import { ResultsScreen } from '../features/results/ResultsScreen';
import { ThanksScreen } from '../features/thanks/ThanksScreen';

const IDLE_RESET_MS = 3 * 60 * 1000;

export default function App() {
  const { state, dispatch, stepIndex, totalSteps, stepLabel, goTo, next, back, reset, summary } =
    useKioskSession();
  const [toast, setToast] = useState('');
  const [skinProfile, setSkinProfile] = useState<SkinProfile | null>(null);

  // Load the live palette managed in the admin panel; fall back to bundled JSON offline
  useEffect(() => {
    api
      .getCatalog()
      .then((catalog) => {
        const palette = catalog?.palette as PaletteColor[] | undefined;
        if (palette?.length) setActivePalette(palette);
        const designs = catalog?.designs as Parameters<typeof setLiveDesigns>[0] | undefined;
        if (designs?.length) setLiveDesigns(designs);
      })
      .catch(() => {
        /* offline — bundled palette stays active */
      });
  }, []);

  // New visitor — drop the previous skin analysis
  useEffect(() => {
    if (state.step === 'welcome') setSkinProfile(null);
  }, [state.step]);

  // QA / board review: ?preview=results or ?preview=thanks (&name=Irene for thanks)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const preview = params.get('preview') as StepId | null;
    const previewName = params.get('name');
    if (previewName) {
      dispatch({ type: 'SET_PROFILE', profile: { fullName: previewName } });
    }
    if (preview === 'results') {
      dispatch({
        type: 'SET_PROFILE',
        profile: { fullName: previewName || 'Guest', gender: 'female' },
      });
      dispatch({ type: 'SET_CATEGORY', categoryId: 'filipiniana' });
      dispatch({ type: 'SET_DESIGN', designId: params.get('design') || 'fp2' });
      dispatch({ type: 'SET_BACKGROUND', backgroundId: params.get('bg') || 'outdoor' });
      dispatch({
        type: 'SET_SELECTED_COLORS',
        colors: [{ id: 'c10', name: 'Seafoam', hex: '#7FB9A8', sort_order: 10 }],
      });
    }
    if (preview && STEPS.includes(preview)) goTo(preview);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot deep link on load
  }, []);

  useEffect(() => {
    if (state.step === 'welcome' || state.step === 'thanks') return undefined;
    let timer = window.setTimeout(reset, IDLE_RESET_MS);
    const bump = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(reset, IDLE_RESET_MS);
    };
    window.addEventListener('pointerdown', bump);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('pointerdown', bump);
    };
  }, [state.step, reset]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(''), 2500);
  }, []);

  /** HOME tap → visitor info screen. */
  function startFromHome() {
    goTo('profile');
  }

  /** Visitor info confirmed → create session with their details, then camera. */
  async function startSession() {
    try {
      const res = await api.createSession({
        fullName: state.profile.fullName.trim() || 'Guest',
        ageRange: state.profile.ageRange || 'Prefer not to say',
        gender: state.profile.gender || 'prefer_not',
        email: state.profile.email,
      });
      dispatch({ type: 'SET_SESSION', sessionId: res.session_id });
    } catch {
      dispatch({ type: 'SET_SESSION', sessionId: `local-${Date.now()}` });
    }
    goTo('cameraGuide');
  }

  function handleCapture(
    dataUrl: string,
    canvas: HTMLCanvasElement,
    lighting: LightingInfo,
    faceBox: FaceRegion | null,
  ) {
    dispatch({ type: 'SET_LIGHTING', lighting });
    dispatch({ type: 'SET_CAPTURE', dataUrl, faceBox });
    // Read skin from the forehead + cheeks of the detected face, then rank
    // the palette with undertone/depth color science
    const sample = averageImageColor(canvas, faceBox);
    setSkinProfile(analyzeSkinTone(sample));
    const ranked = rankPaletteFromSample(sample);
    dispatch({ type: 'SET_TOP20', top20: ranked });
    goTo('analysis');

    // Record the capture server-side; the local Lab/ITA ranking stays
    // authoritative because it is computed from the detected face region
    if (state.sessionId) {
      api.analyze(state.sessionId, dataUrl).catch(() => {
        /* offline-friendly */
      });
    }
  }

  function applySelectionMode(mode: SelectionMode) {
    dispatch({ type: 'SET_SELECTION_MODE', mode });
    if (mode === 'top5') {
      dispatch({ type: 'SET_SELECTED_COLORS', colors: state.top20.slice(0, 5) });
    } else if (mode === 'top10') {
      dispatch({ type: 'SET_SELECTED_COLORS', colors: state.top20.slice(0, 10) });
    }
    // 'custom' keeps the current picks so the visitor chooses freely
  }

  function toggleColor(color: PaletteColor, limit: number) {
    const exists = state.selectedColors.some((c) => c.id === color.id);
    let nextColors: PaletteColor[];
    if (exists) {
      nextColors = state.selectedColors.filter((c) => c.id !== color.id);
    } else if (state.selectedColors.length < limit) {
      nextColors = [...state.selectedColors, color];
    } else {
      showToast(`Select up to ${limit} colors.`);
      return;
    }
    dispatch({ type: 'SET_SELECTED_COLORS', colors: nextColors });
  }

  async function finalizeSession() {
    const token = `R${Date.now().toString(36).toUpperCase()}`;
    dispatch({ type: 'SET_RESULT_TOKEN', token });
    try {
      if (state.sessionId) {
        await api.completeSession(state.sessionId, {
          selected_colors: state.selectedColors,
          top20: state.top20,
          selection_mode: state.selectionMode,
          category_id: state.categoryId,
          design_id: state.designId,
          fabric_id: state.fabricId,
          background_id: state.backgroundId,
          result_token: token,
        });
      }
    } catch {
      /* offline-friendly */
    }
    goTo('results');
  }

  async function handleHelp() {
    dispatch({ type: 'STAFF_ALERT' });
    showToast('Staff has been notified.');
    try {
      await api.callStaff(state.sessionId);
    } catch {
      /* local toast */
    }
  }

  const hideChrome = state.step === 'welcome' || state.step === 'thanks';
  const limit = state.selectionMode === 'top5' ? 5 : 10;
  const chooseReady =
    state.selectionMode === 'custom'
      ? state.selectedColors.length >= 1
      : state.selectedColors.length === limit;

  let body: ReactNode = null;
  let footer: ReactNode = null;

  switch (state.step) {
    case 'welcome':
      body = <WelcomeScreen onStart={startFromHome} />;
      break;
    case 'profile':
      body = (
        <ProfileScreen
          profile={state.profile}
          onChange={(profile) => dispatch({ type: 'SET_PROFILE', profile })}
          onContinue={startSession}
        />
      );
      footer = <NavButtons onBack={() => goTo('welcome')} hideNext />;
      break;
    case 'cameraGuide':
      body = <AutoScanScreen onCapture={handleCapture} />;
      footer = <NavButtons onBack={() => goTo('profile')} hideNext />;
      break;
    case 'analysis':
      body = (
        <AnalysisScreen
          onDone={() => {
            applySelectionMode('top5');
            goTo('top20');
          }}
        />
      );
      break;
    case 'top20':
      body = (
        <Top20Screen
          colors={state.top20}
          onSuggestTop5={() => {
            applySelectionMode('top5');
            goTo('chooseTop');
          }}
        />
      );
      footer = (
        <NavButtons
          onBack={() => goTo('cameraGuide')}
          onNext={() => goTo('chooseTop')}
          nextLabel="NEXT"
        />
      );
      break;
    case 'chooseTop':
      body = (
        <ChooseTopScreen
          colors={state.top20}
          mode={state.selectionMode}
          selectedColors={state.selectedColors}
          onModeChange={applySelectionMode}
          onToggleColor={toggleColor}
        />
      );
      footer = (
        <NavButtons
          onBack={back}
          onNext={next}
          nextLabel={`CONFIRM (${state.selectedColors.length})`}
          nextIcon="check"
          nextDisabled={!chooseReady}
        />
      );
      break;
    case 'category':
      body = (
        <CategoryScreen
          selectedId={state.categoryId}
          onSelect={(categoryId) => {
            dispatch({ type: 'SET_CATEGORY', categoryId });
            goTo('design');
          }}
        />
      );
      footer = <NavButtons onBack={back} hideNext />;
      break;
    case 'design':
      body = (
        <DesignScreen
          categoryId={state.categoryId}
          selectedId={state.designId}
          gender={state.profile.gender}
          onSelect={(designId) => dispatch({ type: 'SET_DESIGN', designId })}
        />
      );
      footer = <NavButtons onBack={back} onNext={next} nextDisabled={!state.designId} />;
      break;
    case 'fabric':
      body = (
        <FabricScreen
          fabrics={state.fabricMatches}
          selectedId={state.fabricId}
          onSelect={(fabricId) => dispatch({ type: 'SET_FABRIC', fabricId })}
        />
      );
      footer = <NavButtons onBack={back} onNext={next} nextDisabled={!state.fabricId} />;
      break;
    case 'background':
      body = (
        <BackgroundScreen
          selectedId={state.backgroundId}
          onSelect={(backgroundId) => dispatch({ type: 'SET_BACKGROUND', backgroundId })}
        />
      );
      footer = <NavButtons onBack={back} onNext={next} />;
      break;
    case 'preview':
      body = (
        <PreviewScreen
          captureDataUrl={state.captureDataUrl}
          faceBox={state.faceBox}
          gender={state.profile.gender}
          categoryId={state.categoryId}
          designId={state.designId}
          backgroundId={state.backgroundId}
          fabricId={state.fabricId}
          selectedColors={state.selectedColors}
          onBackgroundSelect={(backgroundId) => dispatch({ type: 'SET_BACKGROUND', backgroundId })}
        />
      );
      footer = <NavButtons onBack={back} onNext={next} nextLabel="NEXT" />;
      break;
    case 'recommendation':
      body = <RecommendationScreen summary={summary} skinProfile={skinProfile} />;
      footer = <NavButtons onBack={back} onNext={finalizeSession} nextLabel="GET YOUR RESULT" />;
      break;
    case 'results':
      body = (
        <ResultsScreen
          email={state.profile.email}
          resultToken={state.resultToken}
          captureDataUrl={state.captureDataUrl}
          faceBox={state.faceBox}
          gender={state.profile.gender}
          designId={state.designId}
          backgroundId={state.backgroundId}
          fabricId={state.fabricId}
          selectedColors={state.selectedColors}
          fabricHex={
            FABRICS.find((f) => f.id === state.fabricId)?.hex ||
            state.selectedColors[0]?.hex ||
            '#1E4D8C'
          }
          designName={getDesignById(state.designId)?.name}
          onEmailChange={(email) => dispatch({ type: 'SET_PROFILE', profile: { email } })}
          onSendEmail={async () => {
            if (!state.sessionId) throw new Error('Session unavailable offline.');
            if (!state.profile.email) throw new Error('Enter an email address first.');
            await api.sendEmail(state.sessionId, state.profile.email);
          }}
          onSent={() => goTo('thanks')}
        />
      );
      footer = (
        <NavButtons
          onBack={() => goTo('recommendation')}
          onNext={() => goTo('thanks')}
          nextLabel="DONE"
          nextIcon="check"
        />
      );
      break;
    case 'thanks':
      body = <ThanksScreen name={state.profile.fullName} onReset={reset} />;
      break;
    default:
      body = <WelcomeScreen onStart={startFromHome} />;
  }

  return (
    <Shell
      stepIndex={stepIndex}
      totalSteps={totalSteps}
      stepLabel={stepLabel}
      showHeader={!hideChrome}
      footer={footer}
      onHelp={hideChrome ? null : handleHelp}
      toast={toast}
    >
      {body}
    </Shell>
  );
}

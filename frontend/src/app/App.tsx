import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Check } from 'lucide-react';
import { Shell } from '../shared/ui/Shell';
import { NavButtons } from '../shared/ui/NavButtons';
import { useKioskSession } from '../shared/hooks/useKioskSession';
import { api } from '../shared/api/client';
import { averageImageColor, rankPaletteFromSample } from '../shared/lib/colorEngine';
import type { LightingInfo, PaletteColor, SelectionMode } from '../shared/lib/types';
import { WelcomeScreen } from '../features/welcome/WelcomeScreen';
import { CameraGuideScreen } from '../features/camera/CameraGuideScreen';
import { LightingCheckScreen } from '../features/camera/LightingCheckScreen';
import { LiveScanScreen } from '../features/camera/LiveScanScreen';
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

  /** Guide step 1→2: HOME tap starts a guest session, then CAMERA GUIDE. */
  async function startFromHome() {
    try {
      const res = await api.createSession({
        fullName: 'Guest',
        ageRange: 'Prefer not to say',
        gender: 'prefer_not',
        email: '',
      });
      dispatch({ type: 'SET_SESSION', sessionId: res.session_id });
    } catch {
      dispatch({ type: 'SET_SESSION', sessionId: `local-${Date.now()}` });
    }
    goTo('cameraGuide');
  }

  function handleLightingComplete(lighting: LightingInfo) {
    dispatch({ type: 'SET_LIGHTING', lighting });
    goTo('liveScan');
  }

  function handleCapture(dataUrl: string, canvas: HTMLCanvasElement) {
    dispatch({ type: 'SET_CAPTURE', dataUrl });
    const sample = averageImageColor(canvas);
    const ranked = rankPaletteFromSample(sample);
    dispatch({ type: 'SET_TOP20', top20: ranked });
    goTo('analysis');

    if (state.sessionId) {
      api
        .analyze(state.sessionId, dataUrl)
        .then((res) => {
          if (res?.top20?.length) {
            dispatch({ type: 'SET_TOP20', top20: res.top20 });
          }
        })
        .catch(() => {
          /* local ranking already applied */
        });
    }
  }

  function applySelectionMode(mode: SelectionMode) {
    dispatch({ type: 'SET_SELECTION_MODE', mode });
    if (mode === 'top5') {
      dispatch({ type: 'SET_SELECTED_COLORS', colors: state.top20.slice(0, 5) });
    } else if (mode === 'top10') {
      dispatch({ type: 'SET_SELECTED_COLORS', colors: state.top20.slice(0, 10) });
    } else if (!state.selectedColors.length) {
      dispatch({ type: 'SET_SELECTED_COLORS', colors: state.top20.slice(0, 5) });
    }
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
  const limit = state.selectionMode === 'top10' ? 10 : 5;
  const chooseReady = state.selectedColors.length === limit;

  let body: ReactNode = null;
  let footer: ReactNode = null;

  switch (state.step) {
    case 'welcome':
      body = <WelcomeScreen onStart={startFromHome} />;
      break;
    case 'cameraGuide':
      body = <CameraGuideScreen onContinue={() => goTo('lightingCheck')} />;
      footer = <NavButtons onBack={() => goTo('welcome')} hideNext />;
      break;
    case 'lightingCheck':
      body = <LightingCheckScreen onComplete={handleLightingComplete} />;
      footer = <NavButtons onBack={back} hideNext />;
      break;
    case 'liveScan':
      body = <LiveScanScreen onCapture={handleCapture} />;
      footer = <NavButtons onBack={back} hideNext />;
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
          onBack={() => goTo('liveScan')}
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
          nextLabel="CONFIRM SELECTION"
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
          categoryId={state.categoryId}
          designId={state.designId}
          backgroundId={state.backgroundId}
          fabricId={state.fabricId}
          selectedColors={state.selectedColors}
          onChangeBackground={() => goTo('background')}
          onViewDetails={() => goTo('recommendation')}
        />
      );
      footer = <NavButtons onBack={back} onNext={next} nextLabel="NEXT" />;
      break;
    case 'recommendation':
      body = <RecommendationScreen summary={summary} />;
      footer = <NavButtons onBack={back} onNext={finalizeSession} nextLabel="GET YOUR RESULT" />;
      break;
    case 'results':
      body = (
        <ResultsScreen
          email={state.profile.email}
          resultToken={state.resultToken}
          onEmailChange={(email) => dispatch({ type: 'SET_PROFILE', profile: { email } })}
          onSendEmail={async () => {
            if (!state.sessionId) throw new Error('Session unavailable offline.');
            if (!state.profile.email) throw new Error('Enter an email address first.');
            await api.sendEmail(state.sessionId, state.profile.email);
          }}
          onSkip={() => goTo('thanks')}
        />
      );
      footer = (
        <button type="button" className="btn btn-primary w-full" onClick={() => goTo('thanks')}>
          <Check className="h-4 w-4" />
          Finish Session
        </button>
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

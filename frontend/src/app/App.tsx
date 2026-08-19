import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Shell } from '../shared/ui/Shell';
import { NavButtons } from '../shared/ui/NavButtons';
import { STEPS, useKioskSession } from '../shared/hooks/useKioskSession';
import { api } from '../shared/api/client';
import { setLiveDesigns } from '../shared/lib/catalogStore';
import {
  analyzeSkinTone,
  profileFromServer,
  rankPaletteFromSample,
  skinToneCandidatesFromRegions,
  setActivePalette,
  type SkinProfile,
  type SkinToneCandidate,
} from '../shared/lib/colorEngine';
import { TEXTILES, type TextileId } from '../data/textiles';
import type { FaceRegion, LightingInfo, PaletteColor, SelectionMode, StepId } from '../shared/lib/types';
import { preloadFaceLandmarker, type NormPoint } from '../shared/hooks/useFaceLandmarker';
import { WelcomeScreen } from '../features/welcome/WelcomeScreen';
import { ProfileScreen } from '../features/profile/ProfileScreen';
import { AutoScanScreen } from '../features/camera/AutoScanScreen';
import { SkinToneScreen } from '../features/skintone/SkinToneScreen';
import { AnalysisScreen } from '../features/analysis/AnalysisScreen';
import { Top20Screen } from '../features/colors/Top20Screen';
import { ChooseTopScreen } from '../features/colors/ChooseTopScreen';
import { ColorPreviewScreen } from '../features/colorpreview/ColorPreviewScreen';
import { CategoryScreen } from '../features/category/CategoryScreen';
import { DesignScreen } from '../features/design/DesignScreen';
import { FabricScreen } from '../features/fabric/FabricScreen';
import { AccessoriesScreen } from '../features/accessories/AccessoriesScreen';
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
  const [skinCandidates, setSkinCandidates] = useState<{ swatches: SkinToneCandidate[]; matchIndex: number } | null>(
    null,
  );
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  /** The AI-generated try-on image (person actually wearing the garment) */
  const [tryOnImage, setTryOnImage] = useState<string | null>(null);
  const [textileId, setTextileId] = useState<TextileId | null>(null);

  // Load the live palette managed in the admin panel; fall back to bundled JSON offline
  useEffect(() => {
    preloadFaceLandmarker();
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

  // New visitor — drop the previous analysis and generated imagery
  useEffect(() => {
    if (state.step === 'welcome') {
      setSkinProfile(null);
      setSkinCandidates(null);
      setTryOnImage(null);
      setTextileId(null);
      setAnalyzeError(null);
    }
  }, [state.step]);

  // Changing clothing or textile regenerates on the same session scan.
  useEffect(() => {
    setTryOnImage(null);
  }, [state.designId, state.fabricId, textileId]);

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
        purpose: state.profile.purpose,
      });
      dispatch({ type: 'SET_SESSION', sessionId: res.session_id });
    } catch {
      dispatch({ type: 'SET_SESSION', sessionId: `local-${Date.now()}` });
    }
    goTo('cameraGuide');
  }

  async function handleCapture(
    dataUrl: string,
    _canvas: HTMLCanvasElement,
    lighting: LightingInfo,
    faceBox: FaceRegion | null,
    landmarks: NormPoint[] | null,
    analysisFrames: string[] = [],
  ) {
    dispatch({ type: 'SET_LIGHTING', lighting });
    dispatch({
      type: 'SET_CAPTURE',
      dataUrl,
      faceBox,
      faceLandmarks: landmarks,
      width: _canvas.width,
      height: _canvas.height,
    });
    setAnalyzeError(null);

    // The AI service is the authoritative source: multi-frame Lab median,
    // landmark skin patches, ITA depth + hue undertone. No client substitute.
    try {
      const res = await api.analyze(state.sessionId || '', dataUrl, analysisFrames);
      if (!res.sample_rgb || !res.top20?.length) {
        throw new Error('The analysis service returned no result.');
      }
      const profile = profileFromServer(res);
      setSkinProfile(profile);
      setSkinCandidates(
        skinToneCandidatesFromRegions(res.skin_regions || {}, res.sample_rgb),
      );
      dispatch({ type: 'SET_TOP20', top20: res.top20 });
      if (profile.message && (res.lighting?.status === 'too_dark' || res.lighting?.status === 'too_bright')) {
        setAnalyzeError(profile.message);
        return;
      }
      goTo('skinTone');
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : 'Unable to analyze your photo. Please try again.');
    }
  }

  function retryCapture() {
    setAnalyzeError(null);
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

  function finalizeSession() {
    const token = `R${Date.now().toString(36).toUpperCase()}`;
    dispatch({ type: 'SET_RESULT_TOKEN', token });
    goTo('results');
    if (!state.sessionId) return;
    api
      .completeSession(state.sessionId, {
        selected_colors: state.selectedColors,
        top20: state.top20,
        selection_mode: state.selectionMode,
        category_id: state.categoryId,
        design_id: state.designId,
        fabric_id: state.fabricId,
        background_id: state.backgroundId,
        result_token: token,
      })
      .catch(() => {
        /* offline-friendly — the result is already on screen */
      });
  }

  const hideChrome = state.step === 'welcome';
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
      body = (
        <AutoScanScreen
          onCapture={handleCapture}
          errorMessage={analyzeError}
          onRetry={retryCapture}
        />
      );
      footer = <NavButtons onBack={() => goTo('profile')} hideNext />;
      break;
    case 'skinTone':
      body = (
        <SkinToneScreen
          captureDataUrl={state.captureDataUrl}
          skinProfile={skinProfile}
          candidates={skinCandidates}
          onContinue={() => goTo('analysis')}
          onSelectTone={(rgb) => {
            setSkinProfile(analyzeSkinTone(rgb));
            dispatch({ type: 'SET_TOP20', top20: rankPaletteFromSample(rgb) });
          }}
        />
      );
      break;
    case 'analysis':
      body = (
        <AnalysisScreen
          skinProfile={skinProfile}
          top20={state.top20}
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
          skinProfile={skinProfile}
          onPickMode={(mode) => {
            applySelectionMode(mode);
            goTo('colorPreview');
          }}
        />
      );
      footer = (
        <NavButtons
          onBack={() => goTo('cameraGuide')}
          onNext={() => {
            applySelectionMode(state.selectionMode || 'top5');
            goTo('colorPreview');
          }}
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
    case 'colorPreview':
      body = (
        <ColorPreviewScreen
          captureDataUrl={state.captureDataUrl}
          selectedColors={state.selectedColors}
          top20={state.top20}
        />
      );
      footer = <NavButtons onBack={back} onNext={next} nextLabel="CONTINUE" />;
      break;
    case 'category':
      body = (
        <CategoryScreen
          selectedId={state.categoryId}
          selectedDesignId={state.designId}
          selectedAccessories={state.selectedAccessories}
          gender={state.profile.gender}
          onSelect={(categoryId) => dispatch({ type: 'SET_CATEGORY', categoryId })}
          onSelectDesign={(designId, categoryId) => {
            dispatch({ type: 'SET_CATEGORY', categoryId });
            dispatch({ type: 'SET_DESIGN', designId });
          }}
          onToggleAccessory={(accessory) => dispatch({ type: 'TOGGLE_ACCESSORY', accessory })}
        />
      );
      footer = <NavButtons onBack={back} onNext={next} nextDisabled={!state.designId} nextLabel="CONTINUE" />;
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
          selectedTextileId={textileId}
          onSelect={(fabricId) => dispatch({ type: 'SET_FABRIC', fabricId })}
          onSelectTextile={setTextileId}
        />
      );
      footer = <NavButtons onBack={back} onNext={next} nextDisabled={!state.fabricId} />;
      break;
    case 'accessories':
      body = (
        <AccessoriesScreen
          selectedAccessories={state.selectedAccessories}
          gender={state.profile.gender}
          onToggleAccessory={(accessory) => dispatch({ type: 'TOGGLE_ACCESSORY', accessory })}
        />
      );
      footer = <NavButtons onBack={() => goTo('preview')} onNext={() => goTo('preview')} nextLabel="DONE" />;
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
    case 'preview': {
      const fabric = state.fabricMatches.find((f) => f.id === state.fabricId);
      const textile = textileId ? TEXTILES.find((t) => t.id === textileId) : null;
      const selectedColorHex = state.selectedColors[0]?.hex;
      const tryOnPhoto = state.captureDataUrl;
      body = (
        <PreviewScreen
          captureDataUrl={tryOnPhoto}
          designId={state.designId}
          fabricHex={selectedColorHex || textile?.hex || fabric?.hex || '#7FB9A8'}
          fabricName={textile?.name || fabric?.name}
          textileId={textileId}
          backgroundId={state.backgroundId}
          onBackgroundSelect={(backgroundId) => dispatch({ type: 'SET_BACKGROUND', backgroundId })}
          lighting={state.portraitLighting}
          onLightingChange={(nextLighting) =>
            dispatch({ type: 'SET_PORTRAIT_LIGHTING', lighting: nextLighting })
          }
          onTryOnGenerated={setTryOnImage}
          onTryOnFailed={() => setTryOnImage(null)}
        />
      );
      footer = <NavButtons onBack={back} onNext={finalizeSession} nextDisabled={!tryOnImage} nextLabel="CONTINUE" />;
      break;
    }
    case 'recommendation':
      body = <RecommendationScreen summary={summary} skinProfile={skinProfile} />;
      footer = <NavButtons onBack={back} onNext={finalizeSession} nextLabel="GET YOUR RESULT" />;
      break;
    case 'results':
      body = (
        <ResultsScreen
          email={state.profile.email}
          resultToken={state.resultToken}
          tryOnImage={tryOnImage}
          selectedColors={state.selectedColors}
          selectedAccessories={state.selectedAccessories}
          summary={summary}
          onChangeStyle={() => goTo('category')}
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
          onBack={() => goTo('preview')}
          onNext={() => goTo('thanks')}
          nextLabel="CONTINUE"
        />
      );
      break;
    case 'thanks':
      body = (
        <ThanksScreen
          name={state.profile.fullName}
          email={state.profile.email}
          resultToken={state.resultToken}
          onReset={reset}
        />
      );
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
      toast={toast}
    >
      {body}
    </Shell>
  );
}

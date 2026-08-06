# SpriteForge Capture Studio User Manual

## 1. Architecture

SpriteForge creates a temporary Preview Scene containing the target object, capture camera, three directional lights, optional ground, and Volume. The temporary scene is cleaned up when the window is closed, a job is canceled, or scripts are reloaded. It does not modify the current Scene or add runtime code to the build.

## 2. Still and Multi-Directional Capture

Assign a Prefab in **Still Capture**. The camera uses orthographic projection by default. It projects the world bounds of every enabled Renderer onto the camera plane and automatically calculates a size that contains the subject. `Framing Padding` controls the space around the edges. `Distance / Scale` changes the distance for a perspective camera and the orthographic size for an orthographic camera, so both projection modes can directly control the subject's size in the frame.

The direction count can be set from 1 to 32. Direction angles are distributed evenly starting from `Start Direction`. The Side, Top, Quarter, Diamond, Horizontal Hex, and Vertical Hex presets configure pitch, starting yaw, and direction count together; manually editing any of those fields switches the preset back to Custom. Still capture changes the capture camera's yaw in world space. Animation capture offers **Orbit Camera** and **Rotate Subject (Camera Fixed)** under **Animation Direction Mode**. Alt+Left Mouse adjusts the base camera pitch and yaw shared by both modes. Orbit Camera adds each direction angle to the base camera yaw and orbits the lights by the same amount. Rotate Subject keeps the base camera and lights fixed, applying the inverse direction angle once to the isolated copy's parent capture Pivot. Therefore, “Camera Fixed” means that the camera does not move while iterating through direction angles; it does not prevent the user from adjusting the base camera. The isolated Pivot does not modify objects in the Editor Scene and cannot be restored by the Animator, root motion, constraints, or Prefab scripts. Use **Previous Direction / Next Direction** in the preview to inspect each final angle. Enabling **Still Direction Sprite Sheet** generates a sheet using the configured columns, spacing, and row-major or column-major order.

Opening the main plugin window automatically opens a separate `SpriteForge Preview` Editor window to its right. The preview supports Alt+Left Mouse to orbit the camera, Alt+Shift+Left Mouse to rotate the isolated copy's base subject Pivot, Alt+Right Mouse or Middle Mouse to pan, the mouse wheel to zoom, and F to frame the subject. Shift+F resets the base subject rotation. A normal right-button drag does not modify the camera. The drag action is locked on MouseDown, so releasing Shift midway through a drag does not switch from subject rotation to camera orbit. Subject rotation uses the inverse of the camera-orbit delta so the same drag direction reveals the same side of the subject. It writes only to `ForgeCameraSettings.subjectEuler` and never modifies the Editor Scene object. Every interaction directly updates `ForgeCameraSettings`, and the final export reads the same settings. Panning converts screen pixels to world units using the most recently configured capture-camera snapshot, including the current direction angle and projection size, so preview interaction matches the exported frame.

Interactive refresh uses deadline throttling at up to approximately 30 FPS. Continuous mouse events only merge with or bring forward a queued refresh; they do not keep pushing a debounce timer backward. MouseUp immediately schedules the final frame. Animation Play, Pause, and Stop controls are located in the preview window. Changes to camera, lighting, background, ground, overlay, animation time, and export framing settings automatically schedule a live preview. Preview rendering is limited to 768 px and at most 2× MSAA to avoid repeatedly rendering at high resolution during interaction. Final export still uses the full settings and pushes every completed still or animation frame to the preview window in real time, together with the Prefab, Clip, direction, and frame index. If the preview window is closed manually, reopen it with **Show Preview Window** in the main window.

The language label at the top of the main window always reads `Language`. The dropdown choices always display the complete names `简体中文` and `English` regardless of the current interface language. The label and dropdown use independent widths of 62 px and 130 px instead of sharing Unity's default `labelWidth`, so neither is truncated at the main window's minimum width of 430 px. The selection is stored in EditorPrefs and refreshes the main window, independent preview, settings, progress labels, and standard export messages. On first launch, the plugin follows the Unity Editor language when possible.

## 3. Lighting and Post-Processing

Key, Fill, and Rim are directional lights. Their rotation fields use Pitch/Yaw. Shadows normally only need to be enabled on the Key light. During multi-direction capture with Orbit Camera, all three lights orbit by the same direction angle, keeping their incidence direction consistent relative to the camera and final image. In **Rotate Subject (Camera Fixed)** mode, both the camera and lights remain fixed, giving the two direction modes consistent screen-space lighting.

The three lights in each Preview Scene remain disabled by default. They are enabled according to the settings only during that Studio's current `Camera.Render` call and are disabled immediately after pixel readback. As a result, the main preview, final export, and other temporary captures do not participate in each other's main-light selection or accumulate lighting, even when they coexist.

When Volume is enabled, you can assign:

- A URP/HDRP `VolumeProfile`;
- A `PostProcessProfile` for Built-in Render Pipeline + Post Processing Stack v2.

The bridge discovers installed render-pipeline types at runtime and has no compile-time dependency on URP or HDRP. If a custom pipeline requires additional Camera Data, extend `ForgeRenderPipelineBridge`.

## 4. Background, Ground, and Shadows

The background is composited on the CPU after rendering, so transparent, gradient, and texture behavior is consistent across all three render pipelines. Background textures do not require Read/Write.

Ground modes:

- `None`: does not create visible ground;
- `Solid`: renders a physically lit plane;
- `ShadowComposite`: renders the Shadows Only objects and ground, subtracts a second render without ground shadows, then places the resulting shadow behind the transparent subject image;
- `ShadowOnly`: outputs only the differential shadow described above.

A transparent background combined with `ShadowComposite` produces a subject and ground shadow with Alpha directly.

When `ShadowComposite` or `ShadowOnly` is selected, you can choose one of these shadow styles:

- `Simple`: creates a soft ellipse from the current frame's actual skinned-mesh world bounds without depending on lighting. Shadow scale and edge softness are adjustable. It does not reuse the fixed animation Bounds imported with `SkinnedMeshRenderer`, so the shadow still changes per frame with the bone pose and root displacement even when fixed animation framing is enabled.
- `Top-down`: temporarily points the Key Light straight down only for the two shadow-extraction render passes, producing a real mesh projection directly beneath the subject. The original light is restored immediately before rendering the subject.
- `Matte`: keeps the current Key Light direction and subtracts a no-shadow ground render from a shadowed ground render to create a transparent, physically lit shadow.

All three styles are implemented in the public `Capture` entry point. Live preview, stills, animation sequences, Sprite Sheets, GIFs, and 2D Prefabs generated from those sequences therefore bake exactly the same shadows.

When **Export Detached Shadow** is enabled, the main image continues to use the selected ground mode while a transparent `_Shadow.png` frame and `_Shadow_Sheet.png` are regenerated at every animation sample time. Unified transparent trimming combines the Alpha bounds of the main image and detached shadow, preventing size or Pivot misalignment. If 2D Animation/Prefab generation is also enabled and the main-image ground mode is `None`, the same 2D Clip additionally animates the frame-by-frame Sprite on a `Shadow` child. If the main image already contains ground or a composited shadow, the child is not added again.

**Alpha Outline** is applied before background compositing. Its color, pixel width, and Alpha threshold are configurable, and preview and export use the same step. Detached shadows do not receive a duplicate outline.

**Temporary Subject Overrides** use Transform paths relative to the Prefab root, for example `Rig/Weapon`. A disabled path is forcibly hidden after every sample. A material override consists of a Renderer path, a zero-based material slot, and a replacement Material. All overrides affect only the Preview Scene instance.

## 5. Animation

The Animation page reads Clips from every Animator Controller and Legacy Animation component on the Prefab. **Play/Pause Animation** previews the currently selected file according to the Clip's loop setting: looping Clips wrap, while non-looping Clips stop at the last frame. **Stop** returns to frame 0. Each animation dropdown entry shows the Clip name, asset filename, and Local ID. **Locked Export Identity** shows its path, GUID, and 64-bit Local ID. **Export Selected Animation** stores and passes the `AnimationClip` object itself rather than only the dropdown index. **Export All Animations Separately** creates an independent asset-identity lock, a fresh isolated Prefab copy, and a separate directory for each Clip. Duplicate Clip names receive an automatic numeric suffix.

During loading, the isolated workflow records the original Animator's Avatar, RuntimeAnimatorController, GameObject, and Clip ownership. It also records the actual node hosting every Legacy Animation Clip and preserves all `MonoBehaviour` components on the temporary copy. During Animator Clip sampling, the original Controller exists only as the initialization and Avatar binding context for the Animator. The plugin does not call `Animator.Rebind`, `Animator.Play`, or `Animator.Update` and does not run the Entry/default Idle state, conditions, transitions, BlendTree selection, or any other controller layer.

Each frame first calls `AnimationMode.SampleAnimationClip` twice on the actual Animator node to establish the binding sample, then disables the Animator state machine and calls the direct sample twice more while the Animator remains disabled. The final pose is determined entirely by the Clip selected in the dropdown and its sample time, and it remains held until camera rendering and pixel readback finish. If the target Animator becomes enabled again before rendering, the export fails immediately. Legacy Animation uses direct sampling on its actual host node. Every component exists only on the isolated Preview Scene copy. Animator Animation Events are disabled, and the source Prefab, Scene object, and Controller asset are never modified.

The effective sampling interval is `Frame Step / FPS`. For example, FPS=24 with Frame Step=2 produces 12 FPS output. GIF frame delay automatically uses this effective frame rate. GIF export builds one deterministic adaptive 256-colour palette for the complete animation and shares it across every frame. Index 0 is reserved for transparency. This keeps dark gradients, highlights, and animated subject colours close to the rendered PNG sequence without frame-specific palette shifts.

When **Simulate ParticleSystem** is enabled, every particle system uses a fixed random seed and is simulated from the beginning to the current absolute sample time, preventing Editor Update timing from causing frame-to-frame drift. **Include Particles in Smart Framing** is disabled by default: particles are still rendered, but fixed animation framing uses only model Renderers so wide effects do not shrink the subject excessively. Enable it only when every particle must remain inside the frame. **Mirror Final Frames Horizontally** flips the subject and rendered shadow before outline generation and background/overlay compositing, so watermark text and background direction are not reversed.

**Stabilize Material Time (Anti-Flicker)** is enabled by default. It freezes built-in Shader time in a `MaterialPropertyBlock` on the isolated copy and zeros common swimming, vertex animation, wind, wave, scrolling-speed, and amplitude properties. This prevents Unity Editor global time from changing captures made at the same Clip time. **Suppress Animated Specular Flicker** is also enabled by default. It disables common PBR specular, metallic, smoothness, and clear-coat parameters on the isolated copy. For properties named `_Roughness`, the plugin checks the Shader Inspector display name to distinguish roughness semantics from smoothness semantics. This prevents rapidly rotating fins, weapons, or surface normals from producing a white highlight in only one frame. Neither option writes back to the source Material, and each can be disabled independently when required by the project.

When **Fixed Animation Framing (Preserve Displacement)** is enabled, the plugin first calculates one combined Bounds across every sample time and direction of the selected Clip, then captures all frames with the same camera. Live playback preview caches and reuses the same Bounds. This removes camera breathing and prevents per-frame camera tracking from making root displacement appear to disappear. When disabled, every frame is reframed around the subject's current position.

Camera framing uses only stable Renderer Bounds. The current-pose skinned bounds produced by `BakeMesh` participate only in per-frame Simple shadow calculation and no longer enlarge the camera bounds. This prevents models with imported FBX scaling from suddenly becoming small in the preview while preserving pose-dependent Simple shadows.

When **Generate 2D Animation and Prefab** is enabled, the plugin automatically enables frame-image output and Sprite import. For every Clip and direction, it generates a 2D `AnimationClip`, dedicated `AnimatorController`, separate Sprite `Material`, and a Prefab containing `SpriteRenderer` and `Animator`. If detached shadow export is enabled while the main-image ground mode is `None`, the Prefab also contains a `Shadow` child with sorting order -1, and the same AnimationClip switches its shadow Sprite frame by frame. The 2D Clip uses the effective frame rate described above and inherits the source Clip's loop setting. This feature only supports output directories under the current project's `Assets` folder. Re-exporting updates assets at the same paths while preserving their GUIDs.

**Unified Transparent Trim** calculates the union of Alpha across the entire animation and optional detached shadows, then applies the same crop rectangle to every frame. The Pivot is recalculated from the crop offset, and the crop bounds always include the Pivot pixel. Sprite Sheets support automatic or fixed column counts, cell spacing, and row-major or column-major order. When Normal Map output is enabled, every final frame and sheet receives a `_Normal.png` file that is automatically imported as `TextureImporterType.NormalMap` inside the project. The normals are calculated from the final 2D image's Alpha or Alpha+luminance height field, not from the model GBuffer's 3D surface normals.

In the Animator JSON generated by version 1.0.43, `animationSampling` should be `UnityAnimationWindowSelectedClip_AnimatorDisabled_ControllerBindingOnly_ThroughPixelReadback`. `sourceControllerAssignedDuringSampling`, `animationWindowDirectSamplingApi`, `animationModeHeldThroughPixelReadback`, `animationWindowClipSampleOverridesFinalPose`, `selectedClipAnimatorDisabledDuringRender`, `controllerStateMachineFrozenBeforeFinalClipSample`, `finalClipSampleAppliedWhileAnimatorDisabled`, and `sourceControllerEntryIdleCannotParticipate` should be `true`. `sourceControllerStateMachineEvaluated`, `originalControllerSelectedStateDirectPlay`, `controllerConditionsAutoSatisfied`, `controllerBlendTreeParametersAutoSelected`, and `selectedControllerStateVerifiedBeforeEveryRender` should be `false`. For Legacy Animation, `animationSampling` should be `LegacyAnimationWindowDirectClipSample_ThroughPixelReadback`.

Output structure:

```text
<Output>/<Prefab>/<Clip>/D00_000/
  Clip_D00_000_0000.png
  Clip_D00_000_0000_Shadow.png
  Clip_D00_000_0000_Normal.png
  Clip_D00_000_0001.png
  Clip_D00_000_Sheet.png
  Clip_D00_000_Shadow_Sheet.png
  Clip_D00_000_Normal_Sheet.png
  Clip_D00_000.gif
  Clip_D00_000_2D.anim
  Clip_D00_000_2D.controller
  Clip_D00_000_2D.mat
  Clip_D00_000_2D.prefab
  Clip_D00_000_capture.json
```

## 6. Batch Processing

Batch processing can add the current Project selection in bulk or scan Prefabs with the built-in browser using a directory, name search term, and Unity Label. Jobs advance through `EditorApplication.update` and render only one frame at a time. The progress window supports cancellation. The iterator's `finally` block destroys frame textures stored in memory and disposes the Preview Scene.

Recommendations for large batches:

- Validate the framing preset at 256×256 first;
- Then switch to the final resolution;
- Enable GIF only when needed;
- The total Sprite Sheet dimensions must not exceed the current GPU's `SystemInfo.maxTextureSize`.

## 7. Sprite Import and Pivot

When the output directory is under the project's `Assets` folder and automatic import is enabled:

- Individual images use `SpriteImportMode.Single`;
- Sprite Sheets use `SpriteImportMode.Multiple` and receive an automatically generated Rect for each frame;
- Normal Maps use `TextureImporterType.NormalMap`;
- Mipmaps are disabled, Alpha Is Transparency is enabled, and textures are uncompressed;
- Pivot values use normalized coordinates from 0 to 1.

Files are still written when the output directory is outside the project, but TextureImporter is not invoked.

## 8. Presets

Use the **Presets** page to create, load, or overwrite a `CapturePreset` ScriptableObject. A preset contains camera, lighting, background, ground, overlay, animation, and export settings. Quick-style buttons are only starting points; their settings can still be adjusted and saved as a new preset.

## 9. Troubleshooting

- **The subject is empty or very small**: Check whether its Renderers are enabled. Increase Framing Padding or remove an abnormal distant child object.
- **The animated subject suddenly becomes small**: Check whether **Include Particles in Smart Framing** is enabled. Wide particle Bounds expand the unified animation bounds and should normally remain excluded.
- **The shadow is too faint**: Increase the Key light's shadow strength and **Shadow Extraction**.
- **The Simple shadow does not match the real silhouette**: Simple is a stylized soft ellipse. Use Top-down or Matte when a real mesh projection is required.
- **Transparent trimming does not reduce the image size**: A solid, gradient, or texture background fills the final image's Alpha across the entire canvas. Use a transparent background when trimming is required.
- **A transparent background becomes solid**: In HDRP, confirm that the camera and pipeline allow Alpha output, or validate the material in URP/Built-in first.
- **Preview or export still shows the default Idle or another animation**: Confirm that version 1.0.43 or later is installed. The locked playback identity and **Actual Sampled Clip for This Frame** must have the same GUID and Local ID. **Animation Direct Sample Target** should end with `[Animator disabled; Controller binding only; Entry/Idle cannot evaluate]`, and the sampling mode should be `UnityAnimationWindowSelectedClip_AnimatorDisabled_ControllerBindingOnly_ThroughPixelReadback`. In the Animator JSON, `selectedClipAnimatorDisabledDuringRender`, `finalClipSampleAppliedWhileAnimatorDisabled`, and `sourceControllerEntryIdleCannotParticipate` should be `true`.
- **Preview animates but export is static**: Confirm that version 1.0.10 or later is installed. That version rebuilds the Clip graph after unified-bounds pre-sampling and whenever sample time wraps. Verify that JSON `frameTimes` contains multiple different times. If it contains only one, expand the normalized sample range.
- **AnimationMode is already in use**: Animator Clips and Legacy Animation both use a dedicated AnimationMode transaction. Stop preview or recording in Unity's Animation window first.
- **Root displacement is not visible in preview or export**: Enable **Fixed Animation Framing (Preserve Displacement)**. In JSON, `fixedAnimationFraming` should be `true` and `cameraFollowsAnimatedBounds` should be `false`. When this option is disabled, the camera recenters every frame.
- **Fin, tail, local-position, bone, or muscle motion is missing**: Confirm that version 1.0.42 or later is installed and that the Clip GUID/Local ID under **Actual Sampled Clip for This Frame** matches the selected asset. Direct sampling applies only the curves contained in that Clip. If the intended result depends on another controller layer, StateMachineBehaviour, runtime Rig weights, real game time, physics steps, or objects outside the Preview Scene, it will not be equivalent to playing the Clip by itself in the Animation window.
- **Occasional white flashes, brightness jumps, or inconsistent repeated captures of the same frame**: Keep **Stabilize Material Time (Anti-Flicker)** and **Suppress Animated Specular Flicker** enabled. The first isolates Editor global Shader time, and the second removes isolated highlights caused when animated surface normals rapidly turn toward a light. Capture lights are automatically disabled after every render and require no manual management.
- **The sheet exceeds the limit**: Reduce the frame resolution, shorten the sample range, increase Frame Step, or disable the sheet and export only the sequence.

## 10. License and Third-Party Components

When SpriteForge Capture Studio is obtained through the Unity Asset Store, it is licensed solely under the standard Unity Asset Store EULA. The bundled [LICENSE.md](../LICENSE.md) does not replace, modify, or supplement the standard Unity EULA.

The current package does not include third-party source code, fonts, audio, images, models, Shaders, or templates. The official `com.unity.2d.sprite` dependency is resolved separately by Unity Package Manager and is not redistributed with this package. If any third-party content is added in the future, this file and the Asset Store product description must be updated at the same time.

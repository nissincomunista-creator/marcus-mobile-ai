import * as maplibregl from 'maplibre-gl';
import * as SunCalc from 'suncalc';

export interface SolarCalculationResult {
  hourDecimal: number;
  label: string;
  altitudeRad: number;
  altitudeDeg: number;
  sunAzimuthFromNorthDeg: number;
  shadowDirFromNorthDeg: number;
  isDaylight: boolean;
}

function buildBrtReferenceDate(hourDecimal: number): Date {
  const wholeHours = Math.floor(hourDecimal);
  const mins = Math.round((hourDecimal - wholeHours) * 60);
  const now = new Date();
  // Reference local BRT (America/Sao_Paulo = UTC-3) on current calendar date
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), wholeHours + 3, mins, 0));
}

export function computeSolarPositionBrt(hourDecimal: number, lat: number, lng: number): SolarCalculationResult {
  const date = buildBrtReferenceDate(hourDecimal);
  const sunPos = SunCalc.getPosition(date, lat, lng);

  // SunCalc azimuth = 0 points South, increasing Westward -> clockwise bearing from True North
  const sunAzimuthFromNorthRad = sunPos.azimuth + Math.PI;
  const sunAzimuthFromNorthDeg = ((sunAzimuthFromNorthRad * 180) / Math.PI + 360) % 360;
  const shadowDirRad = sunAzimuthFromNorthRad + Math.PI;
  const shadowDirFromNorthDeg = (sunAzimuthFromNorthDeg + 180) % 360;
  const altitudeDeg = (sunPos.altitude * 180) / Math.PI;
  const isDaylight = sunPos.altitude > 0.02;

  const hh = Math.floor(hourDecimal).toString().padStart(2, '0');
  const mm = Math.round((hourDecimal - Math.floor(hourDecimal)) * 60);
  const label = mm > 0 ? `${hh}:${mm.toString().padStart(2, '0')}` : `${hh}h`;

  return {
    hourDecimal,
    label,
    altitudeRad: sunPos.altitude,
    altitudeDeg: Number(altitudeDeg.toFixed(1)),
    sunAzimuthFromNorthDeg: Number(sunAzimuthFromNorthDeg.toFixed(1)),
    shadowDirFromNorthDeg: Number(shadowDirFromNorthDeg.toFixed(1)),
    isDaylight,
  };
}

function lngToMercX(lng: number): number {
  return (lng + 180) / 360;
}

function latToMercY(lat: number): number {
  const sin = Math.sin((lat * Math.PI) / 180);
  const y = 0.5 - (0.25 / Math.PI) * Math.log((1 + sin) / (1 - sin));
  return Math.max(0, Math.min(1, y));
}

/**
 * Fast, rock-solid ear-clipping triangulator for simple 2D polygons (concave or convex).
 * Input: open ring [[x0,y0], [x1,y1], ...]. Returns triangle vertex indices into `pts`.
 */
function triangulatePolygon2D(pts: Array<[number, number]>): number[] {
  const n = pts.length;
  if (n < 3) return [];
  if (n === 3) return [0, 1, 2];

  // Ensure CCW winding in X/Y so convexity check is consistent
  let area2 = 0;
  for (let i = 0; i < n; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % n];
    area2 += a[0] * b[1] - b[0] * a[1];
  }
  const indices: number[] = [];
  if (area2 >= 0) {
    for (let i = 0; i < n; i++) indices.push(i);
  } else {
    for (let i = n - 1; i >= 0; i--) indices.push(i);
  }

  const out: number[] = [];
  const cross = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number) =>
    (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);

  const pointInTri = (
    px: number,
    py: number,
    ax: number,
    ay: number,
    bx: number,
    by: number,
    cx: number,
    cy: number
  ) => {
    const c1 = cross(ax, ay, bx, by, px, py);
    const c2 = cross(bx, by, cx, cy, px, py);
    const c3 = cross(cx, cy, ax, ay, px, py);
    return c1 >= -1e-18 && c2 >= -1e-18 && c3 >= -1e-18;
  };

  let guard = indices.length * indices.length + 10;
  let i = 0;
  while (indices.length > 3 && guard-- > 0) {
    const len = indices.length;
    const prevIdx = indices[(i + len - 1) % len];
    const currIdx = indices[i % len];
    const nextIdx = indices[(i + 1) % len];

    const a = pts[prevIdx];
    const b = pts[currIdx];
    const c = pts[nextIdx];

    if (cross(a[0], a[1], b[0], b[1], c[0], c[1]) > 1e-18) {
      let containsOther = false;
      for (let j = 0; j < len; j++) {
        const testIdx = indices[j];
        if (testIdx === prevIdx || testIdx === currIdx || testIdx === nextIdx) continue;
        const p = pts[testIdx];
        if (pointInTri(p[0], p[1], a[0], a[1], b[0], b[1], c[0], c[1])) {
          containsOther = true;
          break;
        }
      }
      if (!containsOther) {
        out.push(prevIdx, currIdx, nextIdx);
        indices.splice(i % len, 1);
        i = i % Math.max(1, indices.length);
        continue;
      }
    }
    i = (i + 1) % len;
  }

  if (indices.length === 3) {
    out.push(indices[0], indices[1], indices[2]);
  }
  return out;
}

function normalizeOpenRing(ring: number[][]): [number, number][] {
  if (!Array.isArray(ring) || ring.length < 3) return [];
  const out: [number, number][] = [];
  for (let i = 0; i < ring.length; i++) {
    const p = ring[i];
    if (!p || p.length < 2 || !Number.isFinite(p[0]) || !Number.isFinite(p[1])) continue;
    const prev = out[out.length - 1];
    if (prev && Math.abs(prev[0] - p[0]) < 1e-7 && Math.abs(prev[1] - p[1]) < 1e-7) continue;
    out.push([p[0], p[1]]);
  }
  if (out.length >= 2) {
    const first = out[0];
    const last = out[out.length - 1];
    if (Math.abs(first[0] - last[0]) < 1e-7 && Math.abs(first[1] - last[1]) < 1e-7) {
      out.pop();
    }
  }
  return out.length >= 3 ? out : [];
}

function compileShader(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader | null {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.warn('[SolarShadowEngine] Shader error:', gl.getShaderInfoLog(sh));
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

function createProgram(gl: WebGL2RenderingContext, vsSrc: string, fsSrc: string): WebGLProgram | null {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vsSrc);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSrc);
  if (!vs || !fs) return null;
  const prog = gl.createProgram();
  if (!prog) return null;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.warn('[SolarShadowEngine] Program link error:', gl.getProgramInfoLog(prog));
    gl.deleteProgram(prog);
    return null;
  }
  return prog;
}

/**
 * High-precision WebGL Custom Layer engine rendering connected building shadow volumes
 * via Stencil Buffer (or FBO fallback) so overlapping shadows NEVER double-darken into smudges.
 */
export class SolarShadowEngine implements maplibregl.CustomLayerInterface {
  readonly id = 'solar-shadow-engine';
  readonly type = 'custom' as const;
  readonly renderingMode = '3d' as const;

  private map: maplibregl.Map | null = null;
  private gl: WebGL2RenderingContext | null = null;

  private meshProgram: WebGLProgram | null = null;
  private quadProgram: WebGLProgram | null = null;
  private fboBlitProgram: WebGLProgram | null = null;

  private meshVbo: WebGLBuffer | null = null;
  private meshVao: WebGLVertexArrayObject | null = null;
  private quadVbo: WebGLBuffer | null = null;
  private quadVao: WebGLVertexArrayObject | null = null;

  // FBO fallback for rare WebGL contexts without stencil bits
  private fbo: WebGLFramebuffer | null = null;
  private fboTex: WebGLTexture | null = null;
  private fboW = 0;
  private fboH = 0;

  private vertexCount = 0;
  private pendingVerts: Float32Array | null = null;
  private originMercX = 0;
  private originMercY = 0;
  private enabled = false;
  private isDarkTheme = false;
  private isNight = false;
  private lastHourDecimal = 9;

  private uMatrixLoc: WebGLUniformLocation | null = null;
  private uQuadColorLoc: WebGLUniformLocation | null = null;
  private uMeshColorLoc: WebGLUniformLocation | null = null;
  private uFboTexLoc: WebGLUniformLocation | null = null;
  private uFboColorLoc: WebGLUniformLocation | null = null;

  onAdd(map: maplibregl.Map, gl: WebGL2RenderingContext): void {
    this.map = map;
    this.gl = gl;

    const meshVs = `#version 300 es
      uniform mat4 u_matrix;
      in vec3 a_pos;
      void main() {
        gl_Position = u_matrix * vec4(a_pos, 1.0);
      }
    `;
    const meshFs = `#version 300 es
      precision mediump float;
      uniform vec4 u_color;
      out vec4 fragColor;
      void main() {
        fragColor = u_color;
      }
    `;
    this.meshProgram = createProgram(gl, meshVs, meshFs);
    if (this.meshProgram) {
      this.uMatrixLoc = gl.getUniformLocation(this.meshProgram, 'u_matrix');
      this.uMeshColorLoc = gl.getUniformLocation(this.meshProgram, 'u_color');
      this.meshVao = gl.createVertexArray();
      this.meshVbo = gl.createBuffer();
      gl.bindVertexArray(this.meshVao);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.meshVbo);
      if (this.pendingVerts && this.pendingVerts.length > 0) {
        gl.bufferData(gl.ARRAY_BUFFER, this.pendingVerts, gl.DYNAMIC_DRAW);
      }
      const loc = gl.getAttribLocation(this.meshProgram, 'a_pos');
      if (loc >= 0) {
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, 3, gl.FLOAT, false, 0, 0);
      }
      gl.bindVertexArray(null);
    }

    const quadVs = `#version 300 es
      in vec2 a_uv;
      out vec2 v_uv;
      void main() {
        v_uv = a_uv * 0.5 + 0.5;
        gl_Position = vec4(a_uv, 0.0, 1.0);
      }
    `;
    const quadFs = `#version 300 es
      precision mediump float;
      uniform vec4 u_color;
      out vec4 fragColor;
      void main() {
        fragColor = u_color;
      }
    `;
    this.quadProgram = createProgram(gl, quadVs, quadFs);
    if (this.quadProgram) {
      this.uQuadColorLoc = gl.getUniformLocation(this.quadProgram, 'u_color');
      this.quadVao = gl.createVertexArray();
      this.quadVbo = gl.createBuffer();
      gl.bindVertexArray(this.quadVao);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.quadVbo);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
        gl.STATIC_DRAW
      );
      const qLoc = gl.getAttribLocation(this.quadProgram, 'a_uv');
      if (qLoc >= 0) {
        gl.enableVertexAttribArray(qLoc);
        gl.vertexAttribPointer(qLoc, 2, gl.FLOAT, false, 0, 0);
      }
      gl.bindVertexArray(null);
    }

    const blitFs = `#version 300 es
      precision mediump float;
      uniform sampler2D u_tex;
      uniform vec4 u_color;
      in vec2 v_uv;
      out vec4 fragColor;
      void main() {
        float mask = texture(u_tex, v_uv).r;
        fragColor = u_color * mask;
      }
    `;
    this.fboBlitProgram = createProgram(gl, quadVs, blitFs);
    if (this.fboBlitProgram) {
      this.uFboTexLoc = gl.getUniformLocation(this.fboBlitProgram, 'u_tex');
      this.uFboColorLoc = gl.getUniformLocation(this.fboBlitProgram, 'u_color');
    }
  }

  onRemove(_map: maplibregl.Map, gl: WebGL2RenderingContext): void {
    try {
      if (this.meshProgram) gl.deleteProgram(this.meshProgram);
      if (this.quadProgram) gl.deleteProgram(this.quadProgram);
      if (this.fboBlitProgram) gl.deleteProgram(this.fboBlitProgram);
      if (this.meshVbo) gl.deleteBuffer(this.meshVbo);
      if (this.meshVao) gl.deleteVertexArray(this.meshVao);
      if (this.quadVbo) gl.deleteBuffer(this.quadVbo);
      if (this.quadVao) gl.deleteVertexArray(this.quadVao);
      if (this.fbo) gl.deleteFramebuffer(this.fbo);
      if (this.fboTex) gl.deleteTexture(this.fboTex);
    } catch {}
    this.map = null;
    this.gl = null;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.vertexCount = 0;
      this.isNight = false;
    }
    this.map?.triggerRepaint();
  }

  /**
   * Synchronously extracts all visible 3D buildings and builds connected shadow meshes
   * (base + extruded walls + displaced top) and uploads them to the GPU VBO.
   */
  rebuildFromMap(
    map: maplibregl.Map,
    hourDecimal: number,
    enabled: boolean,
    isDarkTheme = false,
    isReliefEnabled = false
  ): SolarCalculationResult {
    const center = map.getCenter();
    const solar = computeSolarPositionBrt(hourDecimal, center.lat, center.lng);
    this.enabled = enabled;
    this.isDarkTheme = isDarkTheme;
    this.lastHourDecimal = hourDecimal;

    if (!enabled) {
      this.vertexCount = 0;
      this.isNight = false;
      this.syncMapLighting(map, solar, false, isReliefEnabled);
      map.triggerRepaint();
      return solar;
    }

    this.isNight = !solar.isDaylight;
    this.syncMapLighting(map, solar, true, isReliefEnabled);

    if (!solar.isDaylight) {
      this.vertexCount = 0;
      map.triggerRepaint();
      return solar;
    }

    const zoomNow = map.getZoom();
    if (zoomNow < 13.0) {
      this.vertexCount = 0;
      map.triggerRepaint();
      return solar;
    }

    const buildingLayers = ['rio-edificacoes-3d', 'cities-3d-edificacoes-3d', 'auctions-buildings-3d'].filter((id) =>
      Boolean(map.getLayer(id))
    );
    const features = buildingLayers.length ? map.queryRenderedFeatures({ layers: buildingLayers }) : [];
    if (!features.length) {
      this.vertexCount = 0;
      map.triggerRepaint();
      return solar;
    }

    // Center Mercator origin in Float64 so VBO Float32 vertices stay sub-millimeter accurate
    this.originMercX = lngToMercX(center.lng);
    this.originMercY = latToMercY(center.lat);

    const metersPerMercator = 40075016.6856 * Math.cos((center.lat * Math.PI) / 180);
    const mercPerMeter = 1 / metersPerMercator;
    const shadowDirRad = (solar.shadowDirFromNorthDeg * Math.PI) / 180;
    const clampedAlt = Math.max(solar.altitudeRad, 0.09);
    const hasTerrain = Boolean(map.getTerrain());

    const verts: number[] = [];
    const seenFootprints = new Set<string>();
    const maxBuildings = 1400;
    let processed = 0;

    for (let fIdx = 0; fIdx < features.length && processed < maxBuildings; fIdx++) {
      const feat = features[fIdx];
      const geom = feat?.geometry as any;
      if (!geom || (geom.type !== 'Polygon' && geom.type !== 'MultiPolygon')) continue;

      const props = (feat.properties || {}) as any;
      const hRaw = Number(props.h ?? props.render_height ?? props.height ?? 8);
      const heightM = Number.isFinite(hRaw) && hRaw > 1.5 ? Math.min(140, hRaw) : 8;

      const maxShadowLen = Math.min(heightM / Math.tan(clampedAlt), 220);
      const dxMeters = maxShadowLen * Math.sin(shadowDirRad);
      const dyMeters = maxShadowLen * Math.cos(shadowDirRad);
      const dMercX = dxMeters * mercPerMeter;
      const dMercY = -dyMeters * mercPerMeter; // North (+dyMeters) decreases Mercator Y
      if (Math.hypot(dMercX, dMercY) < 1e-8) continue;

      const rings: number[][][] =
        geom.type === 'Polygon'
          ? [geom.coordinates[0]]
          : (geom.coordinates as number[][][][]).map((poly) => poly[0]).filter(Boolean);

      for (const rawRing of rings) {
        const ring = normalizeOpenRing(rawRing);
        if (ring.length < 3 || ring.length > 96) continue;

        const key = `${Math.round(ring[0][0] * 30000)}_${Math.round(ring[0][1] * 30000)}_${ring.length}`;
        if (seenFootprints.has(key)) continue;
        seenFootprints.add(key);
        processed++;

        let groundElevM = 0;
        if (hasTerrain) {
          try {
            const sampled = map.queryTerrainElevation([ring[0][0], ring[0][1]]);
            if (typeof sampled === 'number' && Number.isFinite(sampled)) groundElevM = sampled + 0.35;
          } catch {}
        }
        const zMerc = groundElevM * mercPerMeter;

        const baseLocal: Array<[number, number]> = new Array(ring.length);
        const topLocal: Array<[number, number]> = new Array(ring.length);
        for (let i = 0; i < ring.length; i++) {
          const bx = lngToMercX(ring[i][0]) - this.originMercX;
          const by = latToMercY(ring[i][1]) - this.originMercY;
          baseLocal[i] = [bx, by];
          topLocal[i] = [bx + dMercX, by + dMercY];
        }

        // 1. Base & Shifted Top triangulated footprint (guarantees 100% solid shape for complex buildings)
        const triIndices = triangulatePolygon2D(baseLocal);
        for (let t = 0; t + 2 < triIndices.length; t += 3) {
          const i0 = triIndices[t];
          const i1 = triIndices[t + 1];
          const i2 = triIndices[t + 2];
          // Base polygon
          verts.push(
            baseLocal[i0][0], baseLocal[i0][1], zMerc,
            baseLocal[i1][0], baseLocal[i1][1], zMerc,
            baseLocal[i2][0], baseLocal[i2][1], zMerc
          );
          // Displaced roof polygon
          verts.push(
            topLocal[i0][0], topLocal[i0][1], zMerc,
            topLocal[i1][0], topLocal[i1][1], zMerc,
            topLocal[i2][0], topLocal[i2][1], zMerc
          );
        }

        // 2. Side shadow quads connecting each edge (P_i, P_{i+1}) -> (P'_i, P'_{i+1}) so shadow is 100% attached
        for (let i = 0; i < ring.length; i++) {
          const j = (i + 1) % ring.length;
          const ax = baseLocal[i][0];
          const ay = baseLocal[i][1];
          const bx = baseLocal[j][0];
          const by = baseLocal[j][1];
          const sax = topLocal[i][0];
          const say = topLocal[i][1];
          const sbx = topLocal[j][0];
          const sby = topLocal[j][1];

          verts.push(ax, ay, zMerc, bx, by, zMerc, sbx, sby, zMerc);
          verts.push(ax, ay, zMerc, sbx, sby, zMerc, sax, say, zMerc);
        }
      }
    }

    const f32 = new Float32Array(verts);
    this.pendingVerts = f32;
    this.vertexCount = verts.length / 3;
    if (this.gl && this.meshVbo && this.vertexCount > 0) {
      const gl = this.gl;
      gl.bindBuffer(gl.ARRAY_BUFFER, this.meshVbo);
      gl.bufferData(gl.ARRAY_BUFFER, f32, gl.DYNAMIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }

    map.triggerRepaint();
    return solar;
  }

  private syncMapLighting(
    map: maplibregl.Map,
    solar: SolarCalculationResult,
    enabled: boolean,
    isReliefEnabled: boolean
  ): void {
    try {
      if (isReliefEnabled && map.getLayer('terrain-hillshade')) {
        map.setPaintProperty(
          'terrain-hillshade',
          'hillshade-illumination-direction',
          enabled ? solar.sunAzimuthFromNorthDeg : 315
        );
        map.setPaintProperty(
          'terrain-hillshade',
          'hillshade-exaggeration',
          enabled ? (solar.isDaylight ? 0.36 : 0.18) : 0.36
        );
      }

      if (!enabled) {
        map.setLight({
          anchor: 'viewport',
          position: [1.15, 210, 38],
          color: this.isDarkTheme ? '#dbeafe' : '#ffffff',
          intensity: this.isDarkTheme ? 0.58 : 0.38,
        });
        return;
      }

      const polar = solar.isDaylight ? Math.max(14, 90 - Math.max(10, solar.altitudeDeg)) : 12;
      map.setLight({
        anchor: 'map',
        position: [1.35, solar.sunAzimuthFromNorthDeg, polar],
        color: solar.isDaylight ? (this.isDarkTheme ? '#dbeafe' : '#ffffff') : '#94a3b8',
        intensity: solar.isDaylight ? (this.isDarkTheme ? 0.52 : 0.38) : 0.22,
      });
    } catch {}
  }

  render(gl: WebGL2RenderingContext, options: maplibregl.CustomRenderMethodInput): void {
    if (!this.enabled || !this.meshProgram || !this.quadProgram || !this.meshVao || !this.quadVao) return;
    if (!this.isNight && this.vertexCount === 0) return;

    // Premultiplied shadow color: crisp & uniform without washing out terrain greens/water
    const alpha = this.isNight ? (this.isDarkTheme ? 0.28 : 0.18) : this.isDarkTheme ? 0.42 : 0.30;
    const baseR = this.isDarkTheme ? 0.0 : 15 / 255;
    const baseG = this.isDarkTheme ? 0.0 : 23 / 255;
    const baseB = this.isDarkTheme ? 0.0 : 42 / 255;
    const pmColor: [number, number, number, number] = [baseR * alpha, baseG * alpha, baseB * alpha, alpha];

    const prevDepthTest = gl.isEnabled(gl.DEPTH_TEST);
    const prevCullFace = gl.isEnabled(gl.CULL_FACE);
    const prevStencilTest = gl.isEnabled(gl.STENCIL_TEST);
    const prevBlend = gl.isEnabled(gl.BLEND);

    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    if (this.isNight) {
      gl.useProgram(this.quadProgram);
      gl.uniform4f(this.uQuadColorLoc, pmColor[0], pmColor[1], pmColor[2], pmColor[3]);
      gl.bindVertexArray(this.quadVao);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      gl.bindVertexArray(null);
      if (prevDepthTest) gl.enable(gl.DEPTH_TEST);
      if (prevCullFace) gl.enable(gl.CULL_FACE);
      if (!prevBlend) gl.disable(gl.BLEND);
      return;
    }

    // Build CPU Float64 translated MVP matrix so local origin keeps sub-mm precision
    const srcM = options.defaultProjectionData.mainMatrix;
    const ox = this.originMercX;
    const oy = this.originMercY;
    const shiftedMatrix = new Float32Array(srcM.length);
    for (let i = 0; i < 16; i++) shiftedMatrix[i] = srcM[i];
    shiftedMatrix[12] = srcM[0] * ox + srcM[4] * oy + srcM[12];
    shiftedMatrix[13] = srcM[1] * ox + srcM[5] * oy + srcM[13];
    shiftedMatrix[14] = srcM[2] * ox + srcM[6] * oy + srcM[14];
    shiftedMatrix[15] = srcM[3] * ox + srcM[7] * oy + srcM[15];

    if (this.fboBlitProgram) {
      // PRIMARY PATH: Isolated Offscreen FBO Mask -> composited ONCE with premultiplied alpha.
      // Preserves MapLibre's internal tile-clipping Stencil Buffer 100% untouched (no color washout!)
      // while still guaranteeing zero overlap darkening across crossing building shadows.
      const w = gl.drawingBufferWidth;
      const h = gl.drawingBufferHeight;
      if (!this.fbo || !this.fboTex || this.fboW !== w || this.fboH !== h) {
        if (this.fbo) gl.deleteFramebuffer(this.fbo);
        if (this.fboTex) gl.deleteTexture(this.fboTex);
        this.fboW = w;
        this.fboH = h;
        this.fboTex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.fboTex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        this.fbo = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.fboTex, 0);
      }

      const prevFbo = gl.getParameter(gl.FRAMEBUFFER_BINDING);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
      if (prevStencilTest) gl.disable(gl.STENCIL_TEST);
      gl.viewport(0, 0, w, h);
      gl.colorMask(true, true, true, true);
      gl.disable(gl.BLEND);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(this.meshProgram);
      gl.uniformMatrix4fv(this.uMatrixLoc, false, shiftedMatrix);
      gl.uniform4f(this.uMeshColorLoc, 1, 1, 1, 1);
      gl.bindVertexArray(this.meshVao);
      gl.drawArrays(gl.TRIANGLES, 0, this.vertexCount);

      gl.bindFramebuffer(gl.FRAMEBUFFER, prevFbo);
      gl.viewport(0, 0, w, h);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(this.fboBlitProgram);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.fboTex);
      gl.uniform1i(this.uFboTexLoc, 0);
      gl.uniform4f(this.uFboColorLoc, pmColor[0], pmColor[1], pmColor[2], pmColor[3]);
      gl.bindVertexArray(this.quadVao);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      gl.bindVertexArray(null);
      if (prevStencilTest) gl.enable(gl.STENCIL_TEST);
    } else if (gl.getParameter(gl.STENCIL_BITS) > 0) {
      // Stencil fallback
      gl.enable(gl.STENCIL_TEST);
      gl.stencilMask(0xff);
      gl.clearStencil(0);
      gl.clear(gl.STENCIL_BUFFER_BIT);
      gl.colorMask(false, false, false, false);
      gl.depthMask(false);
      gl.stencilFunc(gl.ALWAYS, 1, 0xff);
      gl.stencilOp(gl.KEEP, gl.KEEP, gl.REPLACE);

      gl.useProgram(this.meshProgram);
      gl.uniformMatrix4fv(this.uMatrixLoc, false, shiftedMatrix);
      gl.uniform4f(this.uMeshColorLoc, 0, 0, 0, 1);
      gl.bindVertexArray(this.meshVao);
      gl.drawArrays(gl.TRIANGLES, 0, this.vertexCount);

      gl.colorMask(true, true, true, true);
      gl.stencilFunc(gl.EQUAL, 1, 0xff);
      gl.stencilOp(gl.ZERO, gl.ZERO, gl.ZERO);
      gl.useProgram(this.quadProgram);
      gl.uniform4f(this.uQuadColorLoc, pmColor[0], pmColor[1], pmColor[2], pmColor[3]);
      gl.bindVertexArray(this.quadVao);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      gl.bindVertexArray(null);
      gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);
      if (!prevStencilTest) gl.disable(gl.STENCIL_TEST);
    }

    gl.depthMask(true);
    gl.colorMask(true, true, true, true);
    if (prevDepthTest) gl.enable(gl.DEPTH_TEST);
    if (prevCullFace) gl.enable(gl.CULL_FACE);
    if (!prevBlend) gl.disable(gl.BLEND);
  }

  getLastHourDecimal(): number {
    return this.lastHourDecimal;
  }
}

const engineByMap = new WeakMap<maplibregl.Map, SolarShadowEngine>();

export function getOrAttachSolarShadowEngine(map: maplibregl.Map): SolarShadowEngine {
  let engine = engineByMap.get(map);
  if (!engine) {
    engine = new SolarShadowEngine();
    engineByMap.set(map, engine);
  }

  if (!map.getLayer(engine.id)) {
    // Insert IMMEDIATELY BELOW the lowest 3D building fill-extrusion layer
    const buildingLayers = ['rio-edificacoes-3d', 'cities-3d-edificacoes-3d', 'auctions-buildings-3d'];
    const beforeId =
      buildingLayers.find((id) => Boolean(map.getLayer(id))) ||
      map.getStyle()?.layers?.find((l) => l.type === 'symbol')?.id;
    map.addLayer(engine, beforeId);
  }

  return engine;
}

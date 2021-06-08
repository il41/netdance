#ifdef GL_ES
precision mediump float;
#endif

// grab texcoords from vert shader
varying vec2 vTexCoord;

// our texture coming from p5
uniform sampler2D tex0;


//from https://stackoverflow.com/questions/60767805/chromakey-glsl-shader-with-transparent-background
/* uniform sampler2D tex0; */
uniform sampler2D tex1;
uniform vec2 iResolution;

mat4 RGBtoYUV = mat4(0.257,  0.439, -0.148, 0.0,
                        0.504, -0.368, -0.291, 0.0,
                        0.098, -0.071,  0.439, 0.0,
                        0.0625, 0.500,  0.500, 1.0 );

vec4 chromaKey = vec4(0.0, 0.0, 0.0, 1);

vec2 maskRange = vec2(0.005, 0.1);

float colorclose(vec3 yuv, vec3 keyYuv, vec2 tol)
{
    float tmp = sqrt(pow(keyYuv.g - yuv.g, 2.0) + pow(keyYuv.b - yuv.b, 2.0));
    if (tmp < tol.x)
        return 0.0;
    else if (tmp < tol.y)
        return (tmp - tol.x)/(tol.y - tol.x);
    else
        return 1.0;
}


void main() {
  vec2 uv = vTexCoord;

  // the texture is loaded upside down and backwards by default so lets flip it
  uv.y = 1.0 - uv.y;

  vec4 tex = texture2D(tex0, uv);

  float gray = (tex.r + tex.g + tex.b) / 3.0;

  float res = 20.0;
  float scl = res / (10.0);

  float threshR = (fract(floor(tex.r*res)/scl)*scl) ;
  float threshG = (fract(floor(tex.g*res)/scl)*scl) ;
  float threshB = (fract(floor(tex.b*res)/scl)*scl) ;
  vec3 thresh = vec3(threshR, threshG, threshB);



  vec2 fragPos =  gl_FragCoord.xy / iResolution.xy;
  vec4 texColor0 = texture2D(tex0, fragPos);
  vec4 texColor1 = texture2D(tex1, fragPos);

  vec4 keyYUV =  RGBtoYUV * chromaKey;
  vec4 yuv = RGBtoYUV * texColor0;

  float mask = 1.0 - colorclose(yuv.rgb, keyYUV.rgb, maskRange);
  gl_FragColor = max(texColor0 - mask * chromaKey, 0.0) + texColor1 * mask;

  // render the output
  /* gl_FragColor = vec4(thresh, 0.5); */
  vec4 col = max(texColor0 - mask * chromaKey, 0.0);
  if (col.a > 0.0) {
      gl_FragColor = col;
  } else {
      discard;
  }
}

function renderMeshTriangle(dstCtx, d0, d1, d2, srcCanvas, s0, s1, s2) {
  var sax = s1.x - s0.x;
  var say = s1.y - s0.y;
  var sbx = s2.x - s0.x;
  var sby = s2.y - s0.y;

  var dinv = 1 / (sax * sby - say * sbx);

  var i11 = sby * dinv;
  var i22 = sax * dinv;
  var i12 = -say * dinv;
  var i21 = -sbx * dinv;

  var dax = d1.x - d0.x;
  var day = d1.y - d0.y;
  var dbx = d2.x - d0.x;
  var dby = d2.y - d0.y;

  var m11 = i11 * dax + i12 * dbx;
  var m12 = i11 * day + i12 * dby;
  var m21 = i21 * dax + i22 * dbx;
  var m22 = i21 * day + i22 * dby;

  dstCtx.save();
  dstCtx.beginPath();
  dstCtx.moveTo(d0.x, d0.y);
  dstCtx.lineTo(d1.x, d1.y);
  dstCtx.lineTo(d2.x, d2.y);
  dstCtx.clip();

  dstCtx.transform(m11, m12, m21, m22,
    d0.x - (m11 * s0.x + m21 * s0.y),
    d0.y - (m12 * s0.x + m22 * s0.y)
  );
  dstCtx.drawImage(srcCanvas, 0, 0);
  dstCtx.restore();
}


function drawMotionVectors(ctx, preset, vars, settings) {
  if (vars.mv_a >= 0.001) {
    var x,y;

    var width = settings.width;
    var height = settings.height;
    var lineScale = settings.lineScale;

    var nX = (vars.mv_x)>>0;
    var nY = (vars.mv_y)>>0;
    var dx = vars.mv_x - nX;
    var dy = vars.mv_y - nY;
    if (nX > 64) { nX = 64; dx = 0; }
    if (nY > 48) { nY = 48; dy = 0; }


    if (nX > 0 && nY > 0) {

      var dx2 = vars.mv_dx;
      var dy2 = vars.mv_dy;

      var len_mult = vars.mv_l;
      if (dx < 0) dx = 0;
      if (dy < 0) dy = 0;
      if (dx > 1) dx = 1;
      if (dy > 1) dy = 1;

      var r = (vars.mv_r*255)>>0;
      var g = (vars.mv_g*255)>>0;
      var b = (vars.mv_b*255)>>0;
      var a = (vars.mv_a*255)>>0;

      ctx.save();

      ctx.strokeStyle = "rgba(" + r + "," + g + "," + b + "," + a + ")";
      ctx.lineWidth = 2 * lineScale;
      ctx.lineCap = "round";
      ctx.beginPath();

      for (y=0; y<nY; y++) {
        var fy = (y + 0.25)/(nY + dy + 0.25 - 1.0);

        // now move by offset
        fy -= dy2;

        if (fy > 0.0001 && fy < 0.9999) {

          for (x=0; x<nX; x++) {
            var fx = (x + 0.25)/(nX + dx + 0.25 - 1.0);

            // now move by offset
            fx += dx2;

            if (fx > 0.0001 && fx < 0.9999) {
              var vx = (fx * 2.0 - 1.0) * width;
              var vy = (fy * 2.0 - 1.0) * height;
              ctx.moveTo(vx, vy)
              ctx.lineTo(vx+1, vy)
            }
          }

        }
      }

      ctx.stroke();
      ctx.restore();
    }
  }
}

function drawCustomWaves(ctx, preset, vars, settings, soundData, frameData) {
  if (preset.waves.length == 0)
    return;

  var time = frameData.time;

  var shade = [
    [ 1.0, 1.0, 1.0 ],
    [ 1.0, 1.0, 1.0 ],
    [ 1.0, 1.0, 1.0 ],
    [ 1.0, 1.0, 1.0 ]  // for each vertex, then each comp.
  ];

  var shaderAmount = vars.fShader;

  if (shaderAmount >= 0.001) {
    for (var i=0; i<4; i++) {
      shade[i][0] = 0.6 + 0.3*sin(time*30.0*0.0143 + 3 + i*21 + randStart[3]);
      shade[i][1] = 0.6 + 0.3*sin(time*30.0*0.0107 + 1 + i*13 + randStart[1]);
      shade[i][2] = 0.6 + 0.3*sin(time*30.0*0.0129 + 6 + i*9  + randStart[2]);

      var maxshade = ((shade[i][0] > shade[i][1]) ? shade[i][0] : shade[i][1]);
      if (shade[i][2] > maxshade) 
        maxshade = shade[i][2];
      for (var k=0; k<3; k++) {
        shade[i][k] /= maxshade;
        shade[i][k] = 0.5 + 0.5 * shade[i][k];
      }
      for (var k=0; k<3; k++) {
        shade[i][k] = shade[i][k]*(shaderAmount) + 1.0*(1.0 - shaderAmount);
      }
    }
  }

  var shade00 = shade[0][0], shade01 = shade[0][1], shade02 = shade[0][2];
  var shade10 = shade[1][0], shade11 = shade[1][1], shade12 = shade[1][2];
  var shade20 = shade[2][0], shade21 = shade[2][1], shade22 = shade[2][2];
  var shade30 = shade[3][0], shade31 = shade[3][1], shade32 = shade[3][2];

  ctx.save()

  var width = settings.width;
  var height = settings.height;
  var lineScale = settings.lineScale;

  //ctx.translate(width*0.5, height*0.5);
  //ctx.scale(1,-1);

  var waveDataL = soundData.waveDataL;
  var waveDataR = soundData.waveDataR;

  for (var i=0;i<preset.waves.length;i++) {
    var wave = preset.waves[i];
    if (!wave) continue;

    if (wave.enabled) {

      //float mult= (*pos)->scaling*presetOutputs->fWaveScale*( (*pos)->bSpectrum ? 0.015f :1.0f);

      var numSamples = (wave.samples / 4)>>0;
      numSamples = ((numSamples/16)>>0) * 16;
      if (numSamples < 16) numSamples = 16;

      var j_mult = 1.0/(numSamples-1); 

      var points = [];
      var firstr, firstg, firstb, firsta;
      var difColors = false;
      for (var s=0;s<numSamples;s++) {
        var p = points[s] = wave.perPoint(s*j_mult, waveDataL[s], waveDataR[s]);
        if (false && shaderAmount >= 0.001) {
          var x = p.x + 0.5;
          var y = p.y + 0.5;

          var x1 = 1 - x;
          var y1 = 1 - y;
          var r2 = (shade00 * x1 + shade10 * x) * y1 + (shade20 * x1 + shade30 * x) * y;
          var g2 = (shade01 * x1 + shade11 * x) * y1 + (shade21 * x1 + shade31 * x) * y;
          var b2 = (shade02 * x1 + shade12 * x) * y1 + (shade22 * x1 + shade32 * x) * y;

          if (r2 > 1) r2 = 1;
          if (g2 > 1) g2 = 1;
          if (b2 > 1) b2 = 1;

          p.r = (r2*255)>>0;
          p.g = (g2*255)>>0;
          p.b = (b2*255)>>0;
        } else {
          p.r = (p.r*255)>>0;
          p.g = (p.g*255)>>0;
          p.b = (p.b*255)>>0;
        }
        if (s==0) {
          firstr = p.r;
          firstg = p.g;
          firstb = p.b;
          firsta = p.a;
        }
        if (p.r != firstr || p.g != firstg || p.b != firstb || p.a != firsta)
          difColors = true;
      }


      if (wave.bAdditive) {
        ctx.globalCompositeOperation = "lighter";
      } else {
        ctx.globalCompositeOperation = "source-over";
      }

      if (wave.bUseDots) {
        var dotSize = (wave.bDrawThick ? 2.5 : 1.5) * lineScale;
        if (!difColors) {
          ctx.strokeStyle = "rgba(" + points[0].r + "," + points[0].g + "," + points[0].b + "," + points[0].a + ")";
          ctx.lineWidth = (wave.bDrawThick ? 2.5 : 1.5) * lineScale;
          ctx.beginPath();
        }

        for (p=0,j=points.length;p<j;p++) {
          var point = points[p];
          if (isNaN(point.x) || isNaN(point.y))
            continue;
          if (point.a >= 0.001) {
            if (difColors) {
              ctx.fillStyle = "rgba(" + point.r + "," + point.g + "," + point.b + "," + point.a + ")";
              ctx.fillRect(
                point.x * width, 
                point.y * height, 
                dotSize, dotSize
              );
            } else {
              var x = point.x * width;
              var y = point.y * height;
              ctx.moveTo(x, y);
              ctx.lineTo(x+1, y);
            }
          }
        }

        if (!difColors) {
          ctx.stroke();
        }

      } else {
        // Milkdrop paints each line segment with its own color. That's a lot of small paths to draw, so we'll
        // just split the entire path into 16 sub paths and render those with the color of the first point
        var pointsPerSubpath = 16;
        numSamples = ((numSamples/16)>>0)*16;
        var numSubpaths = numSamples / pointsPerSubpath;
        ctx.lineWidth = (wave.bDrawThick ? 1.5 : 0.7) * lineScale;
        for (var j=0;j<numSubpaths;j++) {
          ctx.beginPath();
          var po = j*pointsPerSubpath;
          var first = points[po];
          if (first.a >= 0.001) {
            ctx.strokeStyle = "rgba(" + first.r + "," + first.g + "," + first.b + "," + first.a + ")";
            for (p=0;p<pointsPerSubpath;p++) {
              var point = points[po+p];
              if (p==0)
                ctx.moveTo(point.x * width, point.y * height)
              else
                ctx.lineTo((point.x) * width, point.y * height)
            }
            ctx.stroke();
          }
        }
      }
    }
  }
  ctx.restore();
}

function drawCustomShapes(ctx, preset, vars, settings) {

  if (preset.shapes.length == 0)
    return;

  ctx.save();

  var width = settings.width;
  var height = settings.height;
  var lineScale = settings.lineScale;

  //ctx.scale(1,-1);

  for (var i=0;i<preset.shapes.length;i++) {
    var shape = preset.shapes[i];

    if (!shape) continue;

    if (shape.enabled) {

      var shapeVars = shape.perFrame();
      var sides = shapeVars.sides;

      if (sides > 50) {
        sides = (sides/4)>>0;
      }

      var points = [];
      points[0] = [(shapeVars.x), (shapeVars.y)];

      for (var j=1;j<sides+1;j++) {
        var t = (j-1)/sides;
        points[j] = [];
        points[j][0] = points[0][0] + shapeVars.rad * cos(t*3.1415927*2 + shapeVars.ang + 3.1415927*0.25);
        points[j][1] = points[0][1] + shapeVars.rad * sin(t*3.1415927*2 + shapeVars.ang + 3.1415927*0.25);
      }


      var r = ((shapeVars.r+shapeVars.r2)*0.5 * 255)>>0;
      var g = ((shapeVars.g+shapeVars.g2)*0.5 * 255)>>0;
      var b = ((shapeVars.b+shapeVars.b2)*0.5 * 255)>>0;
      var a = (shapeVars.a+shapeVars.a2)*0.5;

      /*
      var r = (shapeVars.r * 255)>>0;
      var g = (shapeVars.g * 255)>>0;
      var b = (shapeVars.b * 255)>>0;
      var a = shapeVars.a;
      */

      var color = "rgba(" + r + "," + g + "," + b + "," + a + ")";

      if (shapeVars.additive)
        ctx.globalCompositeOperation = "lighter";
      else
        ctx.globalCompositeOperation = "source-over";

      ctx.beginPath();
      for (var p=1;p<points.length;p++) {
        var px = (points[p][0]) * width;
        var py = height - (points[p][1]) * height;
        if (p==1)
          ctx.moveTo(px, py);
        else
          ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();

      if (shapeVars.border_a >= 0.001) {
        var br = (shapeVars.border_r * 255)>>0;
        var bg = (shapeVars.border_g * 255)>>0;
        var bb = (shapeVars.border_b * 255)>>0;
        var ba = shapeVars.border_a;
        var borderColor = "rgba(" + br + "," + bg + "," + bb + "," + ba + ")";
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = (shapeVars.thickOutline ? 1.5 : 1) * lineScale;
        ctx.stroke();
      }
    }
  }
  
  ctx.restore();
}

function drawBorders(ctx, preset, vars, settings) {
  var width = settings.width;
  var height = settings.height;

  if (vars.ob_size > 0 && vars.ob_a > 0) {
    var obr = (vars.ob_r*255)>>0;
    var obg = (vars.ob_g*255)>>0;
    var obb = (vars.ob_b*255)>>0;
    var size = vars.ob_size * 0.5;

    ctx.lineWidth = vars.ob_size * width;
    ctx.strokeStyle = "rgba(" + obr + "," + obg + "," + obb + "," + vars.ob_a + ")";
    ctx.strokeRect(0, 0, width, height);
  }

  if (vars.ib_size > 0 && vars.ib_a > 0) {
    var ibr = (vars.ib_r*255)>>0;
    var ibg = (vars.ib_g*255)>>0;
    var ibb = (vars.ib_b*255)>>0;
    var size = vars.ib_size * 0.5;
    var osize = vars.ob_size;

    ctx.strokeStyle = "rgba(" + ibr + "," + ibg + "," + ibb + "," + vars.ib_a + ")";
    ctx.lineWidth = vars.ib_size * width * 0.5;
    var iwidth = (1-osize)*width;
    var iheight = (1-osize)*height;
    ctx.strokeRect(
      osize*width*0.5 + size*width*0.5, osize*height*0.5 + size*height*0.5, 
      max(0, iwidth - size*width), max(0, iheight - size*height));
  }
}

function drawVideoEcho(ctx, copyCtx, preset, vars, settings) {
  if (vars.fVideoEchoAlpha > 0) {
    var width = settings.width;
    var height = settings.height;
    ctx.save();
    var orient = vars.nVideoEchoOrientation;
    switch (orient) {
      case 0: 
        break;
      case 1: 
        ctx.scale(-1,1);
        ctx.translate(-width,0);
        break;
      case 2: 
        ctx.scale(1,-1);
        ctx.translate(0,-height);
        break;
      case 3: 
        ctx.scale(-1,-1);
        ctx.translate(-width,-height);
        break;
    }
    var echoZoom = vars.fVideoEchoZoom;
    var difx = (echoZoom - 1) * width / 2;
    var dify = (echoZoom - 1) * height / 2;
    ctx.globalAlpha = vars.fVideoEchoAlpha;
    ctx.drawImage(ctx.canvas, 
      -difx, -dify, width*echoZoom, height*echoZoom
    );
    ctx.restore();
  }
}

function drawPerPixelEffects(ctx, pixelCtx, overlayCtx, preset, vars, settings, frameData) {
  var width = settings.width;
  var height = settings.height;
  var pixelMeshSizeX = settings.pixelMeshSizeX;
  var pixelMeshSizeY = settings.pixelMeshSizeY;
  var screenCanvas = ctx.canvas;

  var time = frameData.time;

  var mesh = [];
  var warpTime = time * vars.fWarpAnimSpeed;
  var warpScaleInv = 1.0 / vars.fWarpScale;

  var f = [
    11.68 + 4.0 * cos(warpTime*1.413 + 10),
    8.77 + 3.0 * cos(warpTime*1.113 + 7),
    10.54 + 3.0 * cos(warpTime*1.233 + 3),
    11.49 + 4.0 * cos(warpTime*0.933 + 5)
  ];

  for (var x=0;x<=pixelMeshSizeX;x++) {
    mesh[x] = [];
    for (var y=0;y<=pixelMeshSizeY;y++) {
      var fx = x / pixelMeshSizeX;
      var fy = y / pixelMeshSizeY;

      var px = (fx - 0.5) * 2;
      var py = (fy - 0.5) * 2;

      //var dx2 = dx*2;
      //var dy2 = dy*2;

      //var rad = sqrt(dx2*dx2+dy2*dy2);
      var rad = sqrt(px*px+py*py);
      var ang = atan2(py,px);

      var pixelVars = preset.perPixel(rad, ang, fx, fy, frameData);

      //dx *= pixelVars.zoom * pixelVars.sx;
      //dy *= pixelVars.zoom * pixelVars.sy;

      var cx = pixelVars.cx;
      var cy = pixelVars.cy;
      var sx = pixelVars.sx;
      var sy = pixelVars.sy;
      var dx = pixelVars.dx;
      var dy = pixelVars.dy;
      var zoom = pixelVars.zoom;
      var rot = pixelVars.rot;

      var zoom2 = pow(zoom, pow(pixelVars.zoomexp, rad*2.0 - 1.0));
      //var zoom2inv = 1 / zoom2;
      var zoom2inv = zoom2;

      var u = px * 0.5 * zoom2inv + 0.5;
      var v = py * 0.5 * zoom2inv + 0.5;

      // stretch on X, Y:
      u = (u - cx)/sx + cx;
      v = (v - cy)/sy + cy;

      u += pixelVars.warp*0.0035 * sin(warpTime*0.333 + warpScaleInv * (dx * f[0] - dy * f[3]));
      v += pixelVars.warp*0.0035 * cos(warpTime*0.375 - warpScaleInv * (dx * f[2] + dy * f[1]));
      u += pixelVars.warp*0.0035 * cos(warpTime*0.753 - warpScaleInv * (dx * f[1] - dy * f[2]));
      v += pixelVars.warp*0.0035 * sin(warpTime*0.825 + warpScaleInv * (dx * f[0] + dy * f[3]));

      // rotation:
      var u2 = u - cx;
      var v2 = v - cy;

      var cos_rot = cos(rot);
      var sin_rot = sin(rot);
      u = u2*cos_rot - v2*sin_rot + cx;
      v = u2*sin_rot + v2*cos_rot + cy;

      // translation:
      u += dx;
      v += dy;

      mesh[x][y] = {
        x : (u) * width,
        y : (v) * height
      };
    }
  }

  var cellWidth = 1 / pixelMeshSizeX * width;
  var cellHeight = 1 / pixelMeshSizeY * height;

  for (var x=0;x<pixelMeshSizeX;x++) {
    var px = x / pixelMeshSizeX * width;
    for (var y=0;y<pixelMeshSizeY;y++) {
      var p00 = mesh[x][y];
      var p10 = mesh[x+1][y];
      var p01 = mesh[x][y+1];
      var p11 = mesh[x+1][y+1];

      var py = y / pixelMeshSizeY * height;

      var isIn00 = (p00.x > 0 || p00.x < 1 || p00.y > 0 || p00.y < 1);
      var isIn10 = (p10.x > 0 || p10.x < 1 || p10.y > 0 || p10.y < 1);
      var isIn01 = (p01.x > 0 || p01.x < 1 || p01.y > 0 || p01.y < 1);
      var isIn11 = (p11.x > 0 || p11.x < 1 || p11.y > 0 || p11.y < 1);

      if (isIn00 && isIn10 && isIn11) {
        renderMeshTriangle(
          pixelCtx,  
          p00, p10, p11, 
          screenCanvas,
          { x : px, y : py },
          { x : px+cellWidth, y : py },
          { x : px+cellWidth, y : py+cellHeight }
        )
      }
      if (isIn00 && isIn01 && isIn11) {
        renderMeshTriangle(
          pixelCtx, 
          p00, p01, p11,
          screenCanvas,
          { x : px, y : py },
          { x : px, y : py+cellHeight },
          { x : px+cellWidth, y : py+cellHeight }
        )
      }
    }
  }

  if (settings.drawMeshPoints) {
    overlayCtx.fillStyle = "green";
    for (var x=0;x<=pixelMeshSizeX;x++) {
      for (var y=0;y<=pixelMeshSizeY;y++) {
        var p = mesh[x][y];
        overlayCtx.fillRect(p.x - 2, p.y - 2, 4, 4);
      }
    }
  }

  ctx.clearRect(0,0,width,height);
  ctx.drawImage(pixelCtx.canvas, 0, 0);
}
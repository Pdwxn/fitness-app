# Body diagram geometry provenance

`bodyData.json` (the SVG outlines the muscle map in Progress is drawn from) is
derived from [MuscleMap](https://github.com/melihcolpan/MuscleMap) by Melih
Colpan, used under the MIT License and reproduced below. MuscleMap ships its
path data as Swift source, not `.svg` files; the paths were extracted into
this JSON and filtered down to the 18 "whole muscle" groups this app's
exercise dataset can actually resolve to (sub-group paths like upper/lower
chest, inner/outer quad, front/rear deltoid, upper/lower trapezius, and the
back-only rhomboids/rotator-cuff are dropped — the dataset only ever says
"chest" or "quads", shading a sub-group would be guessing). Nothing else
about the artwork was changed; the four view boxes (male/female ×
front/back) are copied as-is from `BodyPathData.swift`.

This is a one-time extraction (see the scratch script that produced it, not
checked into this repo); `bodyData.json` is not regenerated automatically.

```
MIT License

Copyright (c) 2026 Melih Colpan

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

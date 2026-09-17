# Exercise dataset provenance

`exercises_db_v2.json` is derived from
[`hasaneyldrm/exercises-dataset`](https://github.com/hasaneyldrm/exercises-dataset),
which itself redistributes data originally published as ExerciseDB v1 (later
AscendAPI). It replaced the earlier `yuhonas/free-exercise-db` source
(`exercises_db.json`, kept in this directory for history/rollback only).

- **Metadata** (names, muscles, equipment, instructions): MIT-licensed.
- **Images and gifs** (served at runtime from
  `cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@<pinned commit>/`, never
  copied into this repo): third-party media whose ownership is disputed
  between Gym visual and ExerciseDB/AscendAPI. Neither MIT nor otherwise
  clearly licensed for redistribution. Same ambiguity the previous source
  carried — accepted knowingly when switching datasets (Sept 2026) for the
  animated demos and larger catalog (1,324 vs ~873 exercises).

If this ever needs to be revisited: swap `EXERCISES_DATASET_COMMIT` in
`services/exercisedb_service.py` and re-run
`python manage.py import_exercisedb`, or point `resolve_image_url`/
`resolve_gif_url` at a self-hosted, cleanly licensed pack.

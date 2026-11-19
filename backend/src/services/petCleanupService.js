/*
* Autoria: Felipe Nasser Coelho Moussa
* RA: 25004922
*/

import { GridFSBucket, ObjectId } from "mongodb";

const DOCUMENT_BUCKETS = [
  { collection: "consultations", bucketName: "consultaDocumentos" },
  { collection: "vaccines", bucketName: "vacinaDocumentos" },
];

export async function excluirDadosDosPets(db, petIds) {
  if (!Array.isArray(petIds) || petIds.length === 0) return;

  const ids = petIds
    .map((id) => (id instanceof ObjectId ? id : ObjectId.isValid(id) ? new ObjectId(id) : null))
    .filter(Boolean);

  if (ids.length === 0) return;

  // Remove arquivos no GridFS referenciados em documentos de consultas e vacinas
  for (const { collection, bucketName } of DOCUMENT_BUCKETS) {
    const registros = await db
      .collection(collection)
      .find({ petId: { $in: ids }, "documentos.0": { $exists: true } }, { projection: { documentos: 1 } })
      .toArray();

    if (registros.length === 0) continue;

    const bucket = new GridFSBucket(db, { bucketName });
    for (const reg of registros) {
      for (const doc of reg.documentos || []) {
        if (!doc.fileId) continue;
        try {
          const fid = doc.fileId instanceof ObjectId ? doc.fileId : new ObjectId(doc.fileId);
          await bucket.delete(fid);
        } catch {
          // Ignora caso o arquivo já tenha sido removido
        }
      }
    }
  }

  await Promise.all([
    db.collection("vaccines").deleteMany({ petId: { $in: ids } }),
    db.collection("medications").deleteMany({ petId: { $in: ids } }),
    db.collection("medicationLogs").deleteMany({ petId: { $in: ids } }),
    db.collection("consultations").deleteMany({ petId: { $in: ids } }),
    db.collection("exams").deleteMany({ petId: { $in: ids } }),
  ]);

  // Remove fotos dos pets no GridFS, se houver
  const petsComFoto = await db
    .collection("pets")
    .find({ _id: { $in: ids }, fotoId: { $exists: true, $ne: null } }, { projection: { fotoId: 1 } })
    .toArray();

  if (petsComFoto.length > 0) {
    const fotosBucket = new GridFSBucket(db, { bucketName: "fotosPets" });
    for (const pet of petsComFoto) {
      try {
        const fid = pet.fotoId instanceof ObjectId ? pet.fotoId : new ObjectId(pet.fotoId);
        await fotosBucket.delete(fid);
      } catch {
        // Ignora caso a foto já tenha sido removida
      }
    }
  }

  await db.collection("pets").deleteMany({ _id: { $in: ids } });
}

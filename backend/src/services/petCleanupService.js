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

  await db.collection("pets").deleteMany({ _id: { $in: ids } });
}

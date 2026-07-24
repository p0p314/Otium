import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { ArchiveTooLargeError, ZipArchiveReader } from "./zip-archive.reader";

function makeZip(files: Record<string, string>): Buffer {
  const entries = Object.fromEntries(
    Object.entries(files).map(([name, content]) => [name, strToU8(content)]),
  );
  return Buffer.from(zipSync(entries));
}

describe("ZipArchiveReader", () => {
  it("ne conserve que les fichiers CSV (dossier racine ignoré)", async () => {
    const zip = makeZip({
      "export/movies.csv": "id,title\n1,Dune",
      "export/readme.txt": "ignore me",
    });

    const files = await new ZipArchiveReader().read(zip);

    expect(files).toEqual([{ name: "movies.csv", content: "id,title\n1,Dune" }]);
  });

  it("rejette une archive dont le contenu décompressé dépasse le plafond", async () => {
    const big = "x".repeat(2000);
    const zip = makeZip({ "big.csv": big });

    // Plafond volontairement bas (1 Ko) pour déclencher la garde sans fabriquer un Go.
    await expect(new ZipArchiveReader(1024).read(zip)).rejects.toBeInstanceOf(ArchiveTooLargeError);
  });

  it("rejette une archive comportant trop d'entrées CSV", async () => {
    const zip = makeZip({ "a.csv": "1", "b.csv": "2", "c.csv": "3" });

    await expect(new ZipArchiveReader(undefined, 2).read(zip)).rejects.toBeInstanceOf(
      ArchiveTooLargeError,
    );
  });
});

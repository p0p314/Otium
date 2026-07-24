import type { Request } from "express";
import { describe, expect, it, vi } from "vitest";
import { zipFileFilter } from "./import.controller";

const req = {} as Request;

function accepts(originalname: string, mimetype: string): boolean {
  const cb = vi.fn();
  zipFileFilter(req, { originalname, mimetype }, cb);
  return cb.mock.calls[0]?.[1] as boolean;
}

describe("zipFileFilter", () => {
  it("accepte une archive .zip quel que soit le MIME du navigateur", () => {
    expect(accepts("tvtime.zip", "application/octet-stream")).toBe(true);
    expect(accepts("EXPORT.ZIP", "application/zip")).toBe(true);
  });

  it("accepte un MIME zip même sans extension .zip", () => {
    expect(accepts("archive", "application/x-zip-compressed")).toBe(true);
  });

  it("rejette (sans erreur) les fichiers manifestement non-ZIP", () => {
    expect(accepts("malware.exe", "application/x-msdownload")).toBe(false);
    expect(accepts("data.csv", "text/csv")).toBe(false);
  });

  it("ne propage jamais d'erreur (rejet silencieux → 400 côté handler)", () => {
    const cb = vi.fn();
    zipFileFilter(req, { originalname: "x.txt", mimetype: "text/plain" }, cb);
    expect(cb).toHaveBeenCalledWith(null, false);
  });
});

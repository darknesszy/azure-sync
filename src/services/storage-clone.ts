import { Observable, of, from, concat, combineLatest } from "rxjs"
import { blobList$, setContainer$, blobContainer$ } from "../utils/storage-helper"
import { switchMap, map, tap, combineAll, mapTo, skip } from "rxjs/operators"
import { BlobItem, ContainerClient } from "@azure/storage-blob"
import { write, resolveFolder, transport$ } from "../utils/file-helper"

export const find$ = (containerName: string) => new Observable<BlobItem[]>(sub => {
    blobList$.subscribe(res => sub.next(res), err => sub.error(err), () => sub.complete())
    setContainer$.next(containerName)
})

export const mirror$ = (containerName: string) => new Observable<[BlobItem[], ContainerClient, string]>(sub => {
    const folderPath = resolveFolder(resolveFolder('../BlobTemp'), containerName)

    combineLatest(blobList$, blobContainer$)
    .subscribe(res => sub.next([res[0], res[1], folderPath]), err => sub.error(err), () => sub.complete())

    setContainer$.next(containerName)
}).pipe(
    switchMap(res => concat(
        ...res[0].map(el => 
            from(res[1].getBlockBlobClient(el.name).download(0)).pipe(
                tap(() => console.log(`Streaming - ${el.name}`)),
                switchMap(x => from(write(res[2], el.name, x.readableStreamBody)))
            )
        )
    ).pipe(
        tap(res => console.log(`Downloaded ${res}`)),
        skip(res[0].length - 1),
        mapTo(res[0])
    )),
    switchMap(() => transport$('BlobTemp'))
)

export const replace$ = (containerName: string) => {
    // Mirror Server
}
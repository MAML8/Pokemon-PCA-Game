
//------------PCA-----------
import { Matrix, EigenvalueDecomposition } from 'https://esm.sh/ml-matrix@6.10.4';

export function PCA(matrizA){
    matrizA = new Matrix(matrizA);
    const media = matrizA.mean('column');
    const centralizada = matrizA.subRowVector(media);

    const covarianca = centralizada.transpose().mmul(centralizada);

    const eigs = new EigenvalueDecomposition(covarianca);

    let autovaloresReais = eigs.realEigenvalues;
    let autovetores = eigs.eigenvectorMatrix;

    //Ordenação dos autovalores
    let sortedIndices = autovaloresReais
        .map((val, idx) => ({ val, idx }))
        .sort((a, b) => b.val - a.val) // Decrescente
        .map(item => item.idx);

    // Reordenamos a matriz de autovetores baseada nos índices ordenados
    let sortedV = new Matrix(matrizA.columns, matrizA.columns); // M x M
    for(let j = 0; j < matrizA.columns; j++) {
        sortedV.setColumn(j, autovetores.getColumn(sortedIndices[j]));
    }


    let autovaloresOrdenados = [];
    let totalAutovalores = 0.0;
    for(let j = 0; j < matrizA.columns; j++) {
        autovaloresOrdenados[j] = autovaloresReais[sortedIndices[j]];
        totalAutovalores += autovaloresReais[j];
    }

    return {
        media: media,
        matrizCentralizada: centralizada,
        autovalores: autovaloresOrdenados,
        autovetores: sortedV,
        totalAutovalores: totalAutovalores
    }
}

export function reconstrucao(pcaObj, l, r){
    // Reconstrução: A aproximado = (A_cent * V_k) * V_k^T + Media

    //let erro = pcaObj.totalAutovalores;
    //for(let i = l-1; i<r-1; i++)
    //    erro -= pcaObj.autovalores[i];
    //console.log(erro/pcaObj.totalAutovalores*100.0);

    const Vk = pcaObj.autovetores.subMatrix(0, pcaObj.matrizCentralizada.columns - 1, l - 1, r - 1);
    
    const scores = pcaObj.matrizCentralizada.mmul(Vk);

    const reconstructed = scores.mmul(Vk.transpose());

    return reconstructed.addRowVector(pcaObj.media);
}

export function reconstrucao_melhor(pcaObj, k){
    return reconstrucao(pcaObj, 1, k);
}
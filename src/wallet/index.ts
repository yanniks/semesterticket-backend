import { IPersonalData } from './../pdf/interpreter';
import { Template } from "@walletpass/pass-js";

export async function generatePass({ barcode, personalInfo, serialNumber, originalLink }: { barcode: string, personalInfo: IPersonalData, serialNumber: string, originalLink?: string }): Promise<Buffer> {
    const template = await Template.load(
        "../Semesterticket.pass",
    );
    await template.loadCertificate(
        "../keys/Certificates.pem",
        "semesterticket"
    );
    const pass = template.createPass({ serialNumber, groupingIdentifier: `${personalInfo.matriculationNumber}` });
    pass.expirationDate = personalInfo.semester.end.add("2", "days").format("YYYY-MM-DDTHH:mm[Z]");
    pass.barcodes = [{ format: "PKBarcodeFormatAztec", messageEncoding: "iso-8859-1", message: barcode, altText: serialNumber }];
    pass.headerFields.get("h1")!.value = `${personalInfo.semester.begin.format("MM/YY")} - ${personalInfo.semester.end.subtract("5", "day").format("MM/YY")}`;
    pass.secondaryFields.get("faux1")!.value = personalInfo.school;
    pass.secondaryFields.get("secondary1")!.value = personalInfo.name;
    pass.auxiliaryFields.get("birthdate")!.value = personalInfo.birthdate;
    pass.auxiliaryFields.get("validity")!.value = personalInfo.validityArea;
    pass.auxiliaryFields.get("matrikel")!.value = personalInfo.matriculationNumber;

    if (originalLink !== undefined) {
        pass.backFields.get("link")!.value = originalLink;
    } else {
        pass.backFields.clear();
    }

    return pass.asBuffer();
}
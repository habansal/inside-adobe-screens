export default async function scheduleJsonUtil(url) {
  const extractSheetData = (url) => {
    const sheetDetails = [];
    const columns = document.querySelectorAll('.locations > div');
    for (let i = 0; i < columns.length; i++) {
      const divs = columns[i].getElementsByTagName('div');

      const value = divs[0].textContent;
      const link = divs[1].getElementsByTagName('a')[0].href;
      const linkurl = new URL(link);

      sheetDetails.push({
        name: value,
        link: url.origin + linkurl.pathname,
      });
    }
    return sheetDetails;
  };

  const validateDateFormat = (date) => {
    if (!date) {
      return;
    }
    const dateFormatRegex = new RegExp('^(0?[1-9]|[1-2][0-9]|3[0-1])\/(0?[1-9]|1[0-2])\/([0-9]{4})$');
    if (!dateFormatRegex.test(date)) {
      throw new Error(`Invalid date format: ${date}`);
    }
  };

  const validateTimeFormat = (time) => {
    if (!time) {
      return;
    }
    const timeFormatRegex = new RegExp('^(0?[1-9]|1[0-2]):[0-5][0-9]:[0-5][0-9]\\s(AM|PM)$');
    if (!timeFormatRegex.test(time)) {
      throw new Error(`Invalid time format: ${time}`);
    }
  };

  const isGMT = (timezone) => timezone && timezone.toLowerCase() === 'gmt';

  const validateExtensionAndGetMediaType = (link) => {
    const supportedImageFormats = ['.png', '.jpg', '.jpeg', '.raw', '.tiff'];
    const supportedVideoFormats = ['.mp4', '.wmv', '.avi', '.mpg'];
    let mediaType;
    supportedImageFormats.forEach((format) => {
      if (link.includes(format)) {
        mediaType = 'image';
      }
    });
    supportedVideoFormats.forEach((format) => {
      if (link.includes(format)) {
        mediaType = 'video';
      }
    });
    if (mediaType) {
      return mediaType;
    }
    throw new Error(`Incompatible asset format: ${link}`);
  };

  const processSheetDataResponse = (sheetDataResponse, sheetName) => {
    if (sheetDataResponse[':type'] === 'multi-sheet') {
      return sheetDataResponse[sheetName].data;
    } if (sheetDataResponse[':type'] === 'sheet') {
      return sheetDataResponse.data;
    }
    throw new Error(`Invalid sheet type: ${sheetDataResponse[':type']}`);
  };

  const fetchData = async (url) => {
    let result = '';
    try {
      result = fetch(url)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`request to fetch ${url} failed with status code ${response.status}`);
          }
          return response.text();
        });
      return Promise.resolve(result);
    } catch (e) {
      throw new Error(`request to fetch ${url} failed with status code with error ${e}`);
    }
  };

  const returnAssets = async (url) => {
    const sheetDetails = extractSheetData(url) || [];
    console.log(JSON.stringify(sheetDetails));
    if (sheetDetails.length === 0) {
      console.warn('No sheet data available during HTML generation');
    }
    const assets = [];
    let errorFlag = false;
    for (let sheetIndex = 0; sheetIndex < sheetDetails.length; sheetIndex++) {
      try {
        const sheetDataResponse = JSON.parse(await fetchData(sheetDetails[sheetIndex].link));
        // const sheetDataResponse = JSON.parse();
        if (!sheetDataResponse) {
          console.warn(`Invalid sheet Link ${JSON.stringify(sheetDetails[sheetIndex])}.Skipping processing this one.`);
          return;
        }
        const sheetName = sheetDetails[sheetIndex].name;
        const sheetData = processSheetDataResponse(sheetDataResponse, sheetName);
        for (let row = 0; row < sheetData.length; row++) {
          try {
            const assetDetails = sheetData[row];
            const contentType = validateExtensionAndGetMediaType(assetDetails.Link);
            validateTimeFormat(assetDetails['Start Time']);
            validateTimeFormat(assetDetails['End Time']);
            validateDateFormat(assetDetails['Launch Start']);
            validateDateFormat(assetDetails['Launch End']);
            assets.push({
              link: assetDetails.Link,
              startTime: assetDetails['Start Time'],
              endTime: assetDetails['End Time'],
              launchStartDate: assetDetails['Launch Start'],
              launchEndDate: assetDetails['Launch End'],
              type: contentType,
              isGMT: isGMT(assetDetails.Timezone),
            });
          } catch (err) {
            console.warn(`Error while processing asset ${JSON.stringify(sheetData[row])}`, err);
          }
        }
      } catch (err) {
        errorFlag = true;
        console.warn(`Error while processing sheet ${JSON.stringify(sheetDetails[sheetIndex])}`, err);
      }
    }
    if (assets.length === 0 && errorFlag) {
      // Don't create HTML with no assets when there was an error
      console.log('Skipping HTML generation due to assets length zero along with error occurrence');
      return;
    }
    console.log(`Assets extracted for channel: ${JSON.stringify(assets)}`);
    return assets;
  };
  const result = await returnAssets(url);
  return result;
}

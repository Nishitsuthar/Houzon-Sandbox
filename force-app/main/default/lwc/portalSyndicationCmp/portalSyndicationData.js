export default function portalSyndicationData({ amountOfRecords }) {
  return [...Array(amountOfRecords)].map((_, index) => {
    return {
      name: `Portal (${index})`,
      status: `inactive`
    };
  });
}

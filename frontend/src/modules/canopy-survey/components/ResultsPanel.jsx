import StatTile from "./StatTile";
import StageSection from "./StageSection";
import PocketsTable from "./PocketsTable";
import ErrorBanner from "./ErrorBanner";

export default function ResultsPanel({ result }) {
  if (!result) return null;

  const { detected_trees, class_breakdown, land_utilization, vegetation, planting_capacity, images, warning } = result;

  return (
    <div className="mt-14 space-y-10">
      {warning && <ErrorBanner message={warning} />}

      {/* Summary readout */}
      <section>
        <div className="mb-4 flex items-baseline gap-3">
          <span className="font-mono text-sm text-palm">00</span>
          <h2 className="font-display text-lg font-semibold text-ink">Survey summary</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile value={detected_trees} label="trees detected" accent="canopy" />
          {land_utilization && (
            <StatTile value={land_utilization.available_pct} unit="%" label="available (buffer)" accent="soil" />
          )}
          {vegetation && <StatTile value={vegetation.available_pct} unit="%" label="available (pixel)" accent="soil" />}
          {planting_capacity && (
            <StatTile value={planting_capacity.new_trees_that_fit} label="new trees that fit" accent="flare" />
          )}
        </div>
        {class_breakdown && Object.keys(class_breakdown).length > 0 && (
          <p className="mt-3 font-mono text-xs text-ink-muted">
            class breakdown —{" "}
            {Object.entries(class_breakdown)
              .map(([name, count]) => `${name}: ${count}`)
              .join(", ")}
          </p>
        )}
      </section>

      <StageSection
        index={1}
        title="Detection"
        description="bounding boxes + confidence"
        imageUrl={images.detections}
        imageAlt="Detected trees with bounding boxes and confidence scores"
      />

      {land_utilization && (
        <StageSection
          index={2}
          title="Land utilization"
          description={`circle-buffer approximation · ${land_utilization.buffer_px}px canopy buffer`}
          imageUrl={images.heatmap}
          imageAlt="Kernel density heatmap of tree locations"
        >
          <div className="grid grid-cols-3 gap-3 sm:max-w-md">
            <StatTile value={land_utilization.utilized_pct} unit="%" label="utilized" accent="canopy" />
            <StatTile value={land_utilization.available_pct} unit="%" label="available" accent="soil" />
            <StatTile value={land_utilization.tree_count} label="trees" accent="ink" />
          </div>
        </StageSection>
      )}

      {vegetation && (
        <StageSection
          index={3}
          title="Pixel-accurate empty space"
          description="excess-green-index vegetation mask"
          imageUrl={images.empty_space}
          imageAlt="Pixel-accurate empty space overlay with numbered planting pockets"
        >
          <div className="grid grid-cols-2 gap-3 sm:max-w-xs">
            <StatTile value={vegetation.available_pct} unit="%" label="available" accent="soil" />
            <StatTile value={vegetation.pocket_count} label="candidate pockets" accent="ink" />
          </div>
          {vegetation.top_pockets && vegetation.top_pockets.length > 0 && (
            <div className="mt-4">
              <PocketsTable pockets={vegetation.top_pockets} />
            </div>
          )}
        </StageSection>
      )}

      {images.mask_sanity && (
        <StageSection
          index={"3b"}
          title="Debug: vegetation mask sanity check"
          description="original / mask / overlay"
          imageUrl={images.mask_sanity}
          imageAlt="Original image, vegetation mask, and overlay side by side"
        />
      )}

      {planting_capacity && (
        <StageSection
          index={4}
          title="Real planting capacity"
          description="greedy, spacing-aware placement"
          imageUrl={images.planting_capacity}
          imageAlt="Map of real planting capacity with new tree positions marked"
        >
          <div className="grid grid-cols-3 gap-3 sm:max-w-md">
            <StatTile value={planting_capacity.existing_trees} label="existing trees" accent="ink" />
            <StatTile value={planting_capacity.new_trees_that_fit} label="new trees fit" accent="flare" />
            <StatTile value={planting_capacity.required_spacing_px} unit="px" label="min spacing" accent="ink" />
          </div>
        </StageSection>
      )}
    </div>
  );
}

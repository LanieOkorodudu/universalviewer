import {BaseCommands} from "../../modules/uv-shared-module/BaseCommands";
import {BaseExtension} from "../../modules/uv-shared-module/BaseExtension";
import {Bookmark} from "../../modules/uv-shared-module/Bookmark";
import {Bootstrapper} from "../../Bootstrapper";
import {Bounds} from "./Bounds";
import {Commands} from "./Commands";
import {ContentLeftPanel} from "../../modules/uv-contentleftpanel-module/ContentLeftPanel";
import {CroppedImageDimensions} from "./CroppedImageDimensions";
import {DownloadDialogue} from "./DownloadDialogue";
import {ExternalContentDialogue} from "../../modules/uv-dialogues-module/ExternalContentDialogue";
import {FooterPanel as MobileFooterPanel} from "../../modules/uv-osdmobilefooterpanel-module/MobileFooter";
import {FooterPanel} from "../../modules/uv-searchfooterpanel-module/FooterPanel";
import {HelpDialogue} from "../../modules/uv-dialogues-module/HelpDialogue";
import {ISeadragonExtension} from "./ISeadragonExtension";
import {Metrics} from "../../modules/uv-shared-module/Metrics";
import {Mode} from "./Mode";
import {MoreInfoDialogue} from "../../modules/uv-dialogues-module/MoreInfoDialogue";
import {MoreInfoRightPanel} from "../../modules/uv-moreinforightpanel-module/MoreInfoRightPanel";
import {MultiSelectDialogue} from "../../modules/uv-multiselectdialogue-module/MultiSelectDialogue";
import {MultiSelectionArgs} from "./MultiSelectionArgs";
import {PagingHeaderPanel} from "../../modules/uv-pagingheaderpanel-module/PagingHeaderPanel";
import {Params} from "../../Params";
import {Point} from "../../modules/uv-shared-module/Point";
import {SeadragonCenterPanel} from "../../modules/uv-seadragoncenterpanel-module/SeadragonCenterPanel";
import {SettingsDialogue} from "./SettingsDialogue";
import {ShareDialogue} from "./ShareDialogue";
import {Shell} from "../../modules/uv-shared-module/Shell";
import IThumb = Manifold.IThumb;
import ITreeNode = Manifold.ITreeNode;
import SearchResult = Manifold.SearchResult;
import SearchResultRect = Manifold.SearchResultRect;
import Size = Utils.Measurements.Size;
declare var _: any; // todo: remove lodash

export class Extension extends BaseExtension implements ISeadragonExtension {

    $downloadDialogue: JQuery;
    $externalContentDialogue: JQuery;
    $helpDialogue: JQuery;
    $moreInfoDialogue: JQuery;
    $multiSelectDialogue: JQuery;
    $settingsDialogue: JQuery;
    $shareDialogue: JQuery;
    centerPanel: SeadragonCenterPanel;
    currentRotation: number = 0;
    currentSearchResultRect: SearchResultRect;
    downloadDialogue: DownloadDialogue;
    externalContentDialogue: ExternalContentDialogue;
    footerPanel: FooterPanel;
    headerPanel: PagingHeaderPanel;
    helpDialogue: HelpDialogue;
    isSearching: boolean = false;
    leftPanel: ContentLeftPanel;
    mobileFooterPanel: MobileFooterPanel;
    mode: Mode;
    moreInfoDialogue: MoreInfoDialogue;
    multiSelectDialogue: MultiSelectDialogue;
    previousSearchResultRect: SearchResultRect;
    rightPanel: MoreInfoRightPanel;
    searchResults: SearchResult[] | null = [];
    settingsDialogue: SettingsDialogue;
    shareDialogue: ShareDialogue;

    constructor(bootstrapper: Bootstrapper) {
        super(bootstrapper);
    }

    create(): void {
        super.create();

        $.subscribe(BaseCommands.METRIC_CHANGED, () => {
            if (this.metric === Metrics.MOBILE_LANDSCAPE) {
                const settings: ISettings = {};
                settings.pagingEnabled = false;
                this.updateSettings(settings);
                $.publish(BaseCommands.UPDATE_SETTINGS);
                Shell.$rightPanel.hide();
            } else {
                Shell.$rightPanel.show();
            }
        });

        $.subscribe(Commands.CLEAR_SEARCH, () => {
            this.searchResults = null;
            $.publish(Commands.SEARCH_RESULTS_CLEARED);
            this.triggerSocket(Commands.CLEAR_SEARCH);
        });

        $.subscribe(BaseCommands.DOWN_ARROW, () => {
            if (!this.useArrowKeysToNavigate()) {
                this.centerPanel.setFocus();
            }
        });

        $.subscribe(BaseCommands.END, () => {
            this.viewPage(this.helper.getLastPageIndex());
        });

        $.subscribe(Commands.FIRST, () => {
            this.triggerSocket(Commands.FIRST);
            this.viewPage(this.helper.getFirstPageIndex());
        });

        $.subscribe(Commands.GALLERY_DECREASE_SIZE, () => {
            this.triggerSocket(Commands.GALLERY_DECREASE_SIZE);
        });

        $.subscribe(Commands.GALLERY_INCREASE_SIZE, () => {
            this.triggerSocket(Commands.GALLERY_INCREASE_SIZE);
        });

        $.subscribe(Commands.GALLERY_THUMB_SELECTED, () => {
            this.triggerSocket(Commands.GALLERY_THUMB_SELECTED);
        });

        $.subscribe(BaseCommands.HOME, () => {
            this.viewPage(this.helper.getFirstPageIndex());
        });

        $.subscribe(Commands.IMAGE_SEARCH, (e: any, index: number) => {
            this.triggerSocket(Commands.IMAGE_SEARCH, index);
            this.viewPage(index);
        });

        $.subscribe(Commands.LAST, () => {
            this.triggerSocket(Commands.LAST);
            this.viewPage(this.helper.getLastPageIndex());
        });

        $.subscribe(BaseCommands.LEFT_ARROW, () => {
            if (this.useArrowKeysToNavigate()) {
                this.viewPage(this.getPrevPageIndex());
            } else {
                this.centerPanel.setFocus();
            }
        });

        $.subscribe(BaseCommands.LEFTPANEL_COLLAPSE_FULL_START, () => {
            if (this.metric !== Metrics.MOBILE_LANDSCAPE) {
                Shell.$rightPanel.show();
            }
        });

        $.subscribe(BaseCommands.LEFTPANEL_COLLAPSE_FULL_FINISH, () => {
            Shell.$centerPanel.show();            
            this.resize();
        });

        $.subscribe(BaseCommands.LEFTPANEL_EXPAND_FULL_START, () => {
            Shell.$centerPanel.hide();
            Shell.$rightPanel.hide();
        });

        $.subscribe(BaseCommands.MINUS, () => {
            this.centerPanel.setFocus();
        });

        $.subscribe(Commands.MODE_CHANGED, (e: any, mode: string) => {
            this.triggerSocket(Commands.MODE_CHANGED, mode);
            this.mode = new Mode(mode);
            const settings: ISettings = this.getSettings();
            $.publish(BaseCommands.SETTINGS_CHANGED, [settings]);
        });

        $.subscribe(Commands.MULTISELECTION_MADE, (e: any, ids: string[]) => {
            const args: MultiSelectionArgs = new MultiSelectionArgs();
            args.manifestUri = this.helper.iiifResourceUri;
            args.allCanvases = ids.length === this.helper.getCanvases().length;
            args.canvases = ids;
            args.format = this.config.options.multiSelectionMimeType;
            args.sequence = this.helper.getCurrentSequence().id;
            this.triggerSocket(Commands.MULTISELECTION_MADE, args);
        });

        $.subscribe(Commands.NEXT, () => {
            this.triggerSocket(Commands.NEXT);
            this.viewPage(this.getNextPageIndex());
        });

        $.subscribe(Commands.NEXT_SEARCH_RESULT, () => {
            this.triggerSocket(Commands.NEXT_SEARCH_RESULT);
        });

        $.subscribe(Commands.NEXT_IMAGES_SEARCH_RESULT_UNAVAILABLE, () => {
            this.triggerSocket(Commands.NEXT_IMAGES_SEARCH_RESULT_UNAVAILABLE);
            this.nextSearchResult();
        });

        $.subscribe(Commands.PREV_IMAGES_SEARCH_RESULT_UNAVAILABLE, () => {
            this.triggerSocket(Commands.PREV_IMAGES_SEARCH_RESULT_UNAVAILABLE);
            this.prevSearchResult();
        });

        $.subscribe(Commands.OPEN_THUMBS_VIEW, () => {
            this.triggerSocket(Commands.OPEN_THUMBS_VIEW);
        });

        $.subscribe(Commands.OPEN_TREE_VIEW, () => {
            this.triggerSocket(Commands.OPEN_TREE_VIEW);
        });

        $.subscribe(BaseCommands.PAGE_DOWN, () => {
            this.viewPage(this.getNextPageIndex());
        });

        $.subscribe(Commands.PAGE_SEARCH, (e: any, value: string) => {
            this.triggerSocket(Commands.PAGE_SEARCH, value);
            this.viewLabel(value);
        });

        $.subscribe(BaseCommands.PAGE_UP, () => {
            this.viewPage(this.getPrevPageIndex());
        });

        $.subscribe(Commands.PAGING_TOGGLED, (e: any, obj: any) => {
            this.triggerSocket(Commands.PAGING_TOGGLED, obj);
        });

        $.subscribe(BaseCommands.PLUS, () => {
            this.centerPanel.setFocus();
        });

        $.subscribe(Commands.PREV, () => {
            this.triggerSocket(Commands.PREV);
            this.viewPage(this.getPrevPageIndex());
        });

        $.subscribe(Commands.PREV_SEARCH_RESULT, () => {
            this.triggerSocket(Commands.PREV_SEARCH_RESULT);
        });

        $.subscribe(Commands.PRINT, () => {
            this.print();
        });

        $.subscribe(BaseCommands.RIGHT_ARROW, () => {
            if (this.useArrowKeysToNavigate()) {
                this.viewPage(this.getNextPageIndex());
            } else {
                this.centerPanel.setFocus();
            }
        });

        $.subscribe(Commands.SEADRAGON_ANIMATION, () => {
            this.triggerSocket(Commands.SEADRAGON_ANIMATION);
        });

        $.subscribe(Commands.SEADRAGON_ANIMATION_FINISH, (e: any, viewer: any) => {
            
            const bounds: Bounds | null = this.centerPanel.getViewportBounds();
            
            if (this.centerPanel && bounds){
                this.setParam(Params.xywh, bounds.toString());
            }

            const canvas: Manifesto.ICanvas = this.helper.getCurrentCanvas();

            this.triggerSocket(Commands.CURRENT_VIEW_URI,
                {
                    cropUri: this.getCroppedImageUri(canvas, this.getViewer()),
                    fullUri: this.getConfinedImageUri(canvas, canvas.getWidth())
                });
        });

        $.subscribe(Commands.SEADRAGON_ANIMATION_START, () => {
            this.triggerSocket(Commands.SEADRAGON_ANIMATION_START);
        });

        $.subscribe(Commands.SEADRAGON_OPEN, () => {
            if (!this.useArrowKeysToNavigate()){
                this.centerPanel.setFocus();
            }
        });

        $.subscribe(Commands.SEADRAGON_RESIZE, () => {
            this.triggerSocket(Commands.SEADRAGON_RESIZE);
        });

        $.subscribe(Commands.SEADRAGON_ROTATION, (e: any, rotation: number) => {
            this.triggerSocket(Commands.SEADRAGON_ROTATION);
            this.currentRotation = rotation;
            this.setParam(Params.rotation, rotation.toString());
        });

        $.subscribe(Commands.SEARCH, (e: any, terms: string) => {
            this.triggerSocket(Commands.SEARCH, terms);
            this.searchWithin(terms);
        });

        $.subscribe(Commands.SEARCH_PREVIEW_FINISH, () => {
            this.triggerSocket(Commands.SEARCH_PREVIEW_FINISH);
        });

        $.subscribe(Commands.SEARCH_PREVIEW_START, () => {
            this.triggerSocket(Commands.SEARCH_PREVIEW_START);
        });

        $.subscribe(Commands.SEARCH_RESULTS, (e: any, obj: any) => {
            this.triggerSocket(Commands.SEARCH_RESULTS, obj);
        });

        $.subscribe(Commands.SEARCH_RESULT_CANVAS_CHANGED, (e: any, rect: SearchResultRect) => {
            this.viewPage(rect.canvasIndex);
        });

        $.subscribe(Commands.SEARCH_RESULTS_EMPTY, () => {
            this.triggerSocket(Commands.SEARCH_RESULTS_EMPTY);
        });

        $.subscribe(BaseCommands.THUMB_SELECTED, (e: any, thumb: IThumb) => {
            this.viewPage(thumb.index);
        });

        $.subscribe(Commands.TREE_NODE_SELECTED, (e: any, node: ITreeNode) => {
            this.triggerSocket(Commands.TREE_NODE_SELECTED, node.data.path);
            this.treeNodeSelected(node);
        });

        $.subscribe(BaseCommands.UP_ARROW, () => {
            if (!this.useArrowKeysToNavigate()) {
                this.centerPanel.setFocus();
            }
        });

        $.subscribe(BaseCommands.UPDATE_SETTINGS, () => {
            this.viewPage(this.helper.canvasIndex, true);
            const settings: ISettings = this.getSettings();
            $.publish(BaseCommands.SETTINGS_CHANGED, [settings]);
        });

        $.subscribe(Commands.VIEW_PAGE, (e: any, index: number) => {
            this.triggerSocket(Commands.VIEW_PAGE, index);
            this.viewPage(index);
        });

        Utils.Async.waitFor(() => {
            return this.centerPanel && this.centerPanel.isCreated;
        }, () => {
            this.checkForSearchParam();
            this.checkForRotationParam();
        });
    }

    createModules(): void {
        super.createModules();

        if (this.isHeaderPanelEnabled()){
            this.headerPanel = new PagingHeaderPanel(Shell.$headerPanel);
        } else {
            Shell.$headerPanel.hide();
        }

        if (this.isLeftPanelEnabled()){
            this.leftPanel = new ContentLeftPanel(Shell.$leftPanel);
        } else {
            Shell.$leftPanel.hide();
        }

        this.centerPanel = new SeadragonCenterPanel(Shell.$centerPanel);

        if (this.isRightPanelEnabled()){
            this.rightPanel = new MoreInfoRightPanel(Shell.$rightPanel);
        } else {
            Shell.$rightPanel.hide();
        }

        if (this.isFooterPanelEnabled()){
            this.footerPanel = new FooterPanel(Shell.$footerPanel);
            this.mobileFooterPanel = new MobileFooterPanel(Shell.$mobileFooterPanel);
        } else {
            Shell.$footerPanel.hide();
        }

        this.$helpDialogue = $('<div class="overlay help"></div>');
        Shell.$overlays.append(this.$helpDialogue);
        this.helpDialogue = new HelpDialogue(this.$helpDialogue);

        this.$moreInfoDialogue = $('<div class="overlay moreInfo"></div>');
        Shell.$overlays.append(this.$moreInfoDialogue);
        this.moreInfoDialogue = new MoreInfoDialogue(this.$moreInfoDialogue);

        this.$multiSelectDialogue = $('<div class="overlay multiSelect"></div>');
        Shell.$overlays.append(this.$multiSelectDialogue);
        this.multiSelectDialogue = new MultiSelectDialogue(this.$multiSelectDialogue);

        this.$shareDialogue = $('<div class="overlay share"></div>');
        Shell.$overlays.append(this.$shareDialogue);
        this.shareDialogue = new ShareDialogue(this.$shareDialogue);

        this.$downloadDialogue = $('<div class="overlay download"></div>');
        Shell.$overlays.append(this.$downloadDialogue);
        this.downloadDialogue = new DownloadDialogue(this.$downloadDialogue);

        this.$settingsDialogue = $('<div class="overlay settings"></div>');
        Shell.$overlays.append(this.$settingsDialogue);
        this.settingsDialogue = new SettingsDialogue(this.$settingsDialogue);

        this.$externalContentDialogue = $('<div class="overlay externalContent"></div>');
        Shell.$overlays.append(this.$externalContentDialogue);
        this.externalContentDialogue = new ExternalContentDialogue(this.$externalContentDialogue);

        if (this.isHeaderPanelEnabled()){
            this.headerPanel.init();
        }

        if (this.isLeftPanelEnabled()){
            this.leftPanel.init();
        }

        if (this.isRightPanelEnabled()){
            this.rightPanel.init();
        }

        if (this.isFooterPanelEnabled()){
            this.footerPanel.init();
        }
    }

    checkForSearchParam(): void{
        // if a h value is in the hash params, do a search.
        if (this.isDeepLinkingEnabled()){

            // if a highlight param is set, use it to search.
            const highlight: string | null = this.getParam(Params.highlight);

            if (highlight) {
                highlight.replace(/\+/g, " ").replace(/"/g, "");
                $.publish(Commands.SEARCH, [highlight]);
            }
        }
    }

    checkForRotationParam(): void{
        // if a rotation value is in the hash params, set currentRotation
        if (this.isDeepLinkingEnabled()){

            const rotation: number = Number(this.getParam(Params.rotation));

            if (rotation){
                $.publish(Commands.SEADRAGON_ROTATION, [rotation]);
            }
        }
    }

    viewPage(canvasIndex: number, isReload?: boolean): void {

        // if it's a valid canvas index.
        if (canvasIndex === -1) return;

        if (this.helper.isCanvasIndexOutOfRange(canvasIndex)){
            this.showMessage(this.config.content.canvasIndexOutOfRange);
            canvasIndex = 0;
        }

        if (this.isPagingSettingEnabled() && !isReload){
            const indices: number[] = this.getPagedIndices(canvasIndex);

            // if the page is already displayed, only advance canvasIndex.
            if (indices.includes(this.helper.canvasIndex)) {
                this.viewCanvas(canvasIndex);
                return;
            }
        }

        this.viewCanvas(canvasIndex);
    }

    getViewer() {
        return this.centerPanel.viewer;
    }

    getMode(): Mode {
        if (this.mode) return this.mode;

        switch (this.helper.getManifestType().toString()) {
            case manifesto.ManifestType.monograph().toString():
                return Mode.page;
            case manifesto.ManifestType.manuscript().toString():
                return Mode.page;
            default:
                return Mode.image;
        }
    }

    getViewportBounds(): string | null {
        if (!this.centerPanel) return null;
        const bounds = this.centerPanel.getViewportBounds();
        if (bounds) {
            return bounds.toString();
        }
        return null;
    }

    getViewerRotation(): number | null {
        if (!this.centerPanel) return null;
        return this.currentRotation;
    }

    viewRange(path: string): void {
        //this.currentRangePath = path;
        const range: Manifesto.IRange = this.helper.getRangeByPath(path);
        if (!range) return;
        const canvasId: string = range.getCanvasIds()[0];
        const index: number = this.helper.getCanvasIndexById(canvasId);
        this.viewPage(index);
    }

    viewLabel(label: string): void {

        if (!label) {
            this.showMessage(this.config.modules.genericDialogue.content.emptyValue);
            $.publish(BaseCommands.CANVAS_INDEX_CHANGE_FAILED);
            return;
        }

        const index: number = this.helper.getCanvasIndexByLabel(label);

        if (index != -1) {
            this.viewPage(index);
        } else {
            this.showMessage(this.config.modules.genericDialogue.content.pageNotFound);
            $.publish(BaseCommands.CANVAS_INDEX_CHANGE_FAILED);
        }
    }

    treeNodeSelected(node: ITreeNode): void{
        const data: any = node.data;
        
        if (!data.type) return;

        switch (data.type){
            case manifesto.IIIFResourceType.manifest().toString():
                this.viewManifest(data);
                break;
            case manifesto.IIIFResourceType.collection().toString():
                // note: this won't get called as the tree component now has branchNodesSelectable = false
                // useful to keep around for reference
                this.viewCollection(data);
                break;
            default:
                this.viewRange(data.path);
                break;
        }
    }

    clearSearch(): void {
        this.searchResults = [];

        // reload current index as it may contain results.
        this.viewPage(this.helper.canvasIndex);
    }

    prevSearchResult(): void {
        let foundResult: SearchResult; 
        if (!this.searchResults) return;

        // get the first result with a canvasIndex less than the current index.
        for (let i = this.searchResults.length - 1; i >= 0; i--) {
            const result: SearchResult = this.searchResults[i];

            if (result.canvasIndex <= this.getPrevPageIndex()) {
                foundResult = result;
                this.viewPage(foundResult.canvasIndex);
                break;
            }
        }
    }

    nextSearchResult(): void {
        let foundResult: SearchResult; 
        if (!this.searchResults) return;
        
        // get the first result with an index greater than the current index.
        for (let i = 0; i < this.searchResults.length; i++) {
            const result: SearchResult = this.searchResults[i];

            if (result && result.canvasIndex >= this.getNextPageIndex()) {
                foundResult = result;
                this.viewPage(result.canvasIndex);
                break;
            }
        }
    }

    bookmark(): void {
        super.bookmark();

        const canvas: Manifesto.ICanvas = this.helper.getCurrentCanvas();
        const bookmark: Bookmark = new Bookmark();

        bookmark.index = this.helper.canvasIndex;
        bookmark.label = <string>Manifesto.TranslationCollection.getValue(canvas.getLabel());
        bookmark.path = <string>this.getCroppedImageUri(canvas, this.getViewer());
        bookmark.thumb = canvas.getCanonicalImageUri(this.config.options.bookmarkThumbWidth);
        bookmark.title = this.helper.getLabel();
        bookmark.trackingLabel = window.trackingLabel;
        bookmark.type = manifesto.ElementType.image().toString();

        this.triggerSocket(BaseCommands.BOOKMARK, bookmark);
    }

    print(): void {
        // var args: MultiSelectionArgs = new MultiSelectionArgs();
        // args.manifestUri = this.helper.iiifResourceUri;
        // args.allCanvases = true;
        // args.format = this.config.options.printMimeType;
        // args.sequence = this.helper.getCurrentSequence().id;
        window.print();
        this.triggerSocket(Commands.PRINT);
    }

    getCroppedImageDimensions(canvas: Manifesto.ICanvas, viewer: any): CroppedImageDimensions | null {
        if (!viewer) return null;
        if (!viewer.viewport) return null;

        if (!canvas.getHeight() || !canvas.getWidth()){
            return null;
        }

        const bounds = viewer.viewport.getBounds(true);

        const dimensions: CroppedImageDimensions = new CroppedImageDimensions();

        let width: number = Math.floor(bounds.width);
        let height: number = Math.floor(bounds.height);
        let x: number = Math.floor(bounds.x);
        let y: number = Math.floor(bounds.y);

        // constrain to image bounds
        if (x + width > canvas.getWidth()) {
            width = canvas.getWidth() - x;
        } else if (x < 0){
            width = width + x;
            x = 0;
        }

        if (y + height > canvas.getHeight()) {
            height = canvas.getHeight() - y;
        } else if (y < 0){
            height = height + y;
            y = 0;
        }
        
        width = Math.min(width, canvas.getWidth());
        height = Math.min(height, canvas.getHeight());       
        let regionWidth: number = width;
        let regionHeight: number = height;

        if (canvas.externalResource.data && canvas.externalResource.data.profile && canvas.externalResource.data.profile[1]) {

          const maxSize: Size =  new Size(canvas.externalResource.data.profile[1].maxWidth, canvas.externalResource.data.profile[1].maxHeight);

          if (!_.isUndefined(maxSize.width) && !_.isUndefined(maxSize.height)){

            if (width > maxSize.width) {
                let newWidth: number = maxSize.width;
                height = Math.round(newWidth * (height / width));
                width = newWidth;
            }

            if (height > maxSize.height) {
                let newHeight: number = maxSize.height;
                width = Math.round((width / height) * newHeight);
                height = newHeight;
            }
          } 
        }

        dimensions.region = new Size(regionWidth, regionHeight);
        dimensions.regionPos = new Point(x, y);
        dimensions.size = new Size(width, height);

        return dimensions;
    }

    // keep this around for reference

    // getOnScreenCroppedImageDimensions(canvas: Manifesto.ICanvas, viewer: any): CroppedImageDimensions {

    //     if (!viewer) return null;
    //     if (!viewer.viewport) return null;

    //     if (!canvas.getHeight() || !canvas.getWidth()){
    //         return null;
    //     }

    //     var bounds = viewer.viewport.getBounds(true);
    //     var containerSize = viewer.viewport.getContainerSize();
    //     var zoom = viewer.viewport.getZoom(true);

    //     var top = Math.max(0, bounds.y);
    //     var left = Math.max(0, bounds.x);

    //     // change top to be normalised value proportional to height of image, not width (as per OSD).
    //     top = 1 / (canvas.getHeight() / parseInt(String(canvas.getWidth() * top)));

    //     // get on-screen pixel sizes.

    //     var viewportWidthPx = containerSize.x;
    //     var viewportHeightPx = containerSize.y;

    //     var imageWidthPx = parseInt(String(viewportWidthPx * zoom));
    //     var ratio = canvas.getWidth() / imageWidthPx;
    //     var imageHeightPx = parseInt(String(canvas.getHeight() / ratio));

    //     var viewportLeftPx = parseInt(String(left * imageWidthPx));
    //     var viewportTopPx = parseInt(String(top * imageHeightPx));

    //     var rect1Left = 0;
    //     var rect1Right = imageWidthPx;
    //     var rect1Top = 0;
    //     var rect1Bottom = imageHeightPx;

    //     var rect2Left = viewportLeftPx;
    //     var rect2Right = viewportLeftPx + viewportWidthPx;
    //     var rect2Top = viewportTopPx;
    //     var rect2Bottom = viewportTopPx + viewportHeightPx;

    //     var sizeWidth = Math.max(0, Math.min(rect1Right, rect2Right) - Math.max(rect1Left, rect2Left));
    //     var sizeHeight = Math.max(0, Math.min(rect1Bottom, rect2Bottom) - Math.max(rect1Top, rect2Top));

    //     // get original image pixel sizes.

    //     var ratio2 = canvas.getWidth() / imageWidthPx;

    //     var regionWidth = parseInt(String(sizeWidth * ratio2));
    //     var regionHeight = parseInt(String(sizeHeight * ratio2));

    //     var regionTop = parseInt(String(canvas.getHeight() * top));
    //     var regionLeft = parseInt(String(canvas.getWidth() * left));

    //     if (regionTop < 0) regionTop = 0;
    //     if (regionLeft < 0) regionLeft = 0;

    //     var dimensions: CroppedImageDimensions = new CroppedImageDimensions();

    //     dimensions.region = new Size(regionWidth, regionHeight);
    //     dimensions.regionPos = new Point(regionLeft, regionTop);
    //     dimensions.size = new Size(sizeWidth, sizeHeight);

    //     return dimensions;
    // }

    getCroppedImageUri(canvas: Manifesto.ICanvas, viewer: any): string | null {

        if (!viewer) return null;
        if (!viewer.viewport) return null;

        const dimensions: CroppedImageDimensions | null = this.getCroppedImageDimensions(canvas, viewer);

        if (!dimensions) return null;

        // construct uri
        // {baseuri}/{id}/{region}/{size}/{rotation}/{quality}.jpg

        const baseUri: string = this.getImageBaseUri(canvas);
        const id: string = this.getImageId(canvas);
        const region: string = dimensions.regionPos.x + "," + dimensions.regionPos.y + "," + dimensions.region.width + "," + dimensions.region.height;
        const size: string = dimensions.size.width + ',' + dimensions.size.height;
        const rotation: number = <number>this.getViewerRotation();
        const quality: string = 'default';
        return `${baseUri}/${id}/${region}/${size}/${rotation}/${quality}.jpg`;
    }

    getConfinedImageDimensions(canvas: Manifesto.ICanvas, width: number): Size {
        const dimensions: Size = new Size(0, 0);
        dimensions.width = width;
        const normWidth = Math.normalise(width, 0, canvas.getWidth());
        dimensions.height = Math.floor(canvas.getHeight() * normWidth);
        return dimensions;
    }

    getConfinedImageUri(canvas: Manifesto.ICanvas, width: number): string {
        const baseUri = this.getImageBaseUri(canvas);

        // {baseuri}/{id}/{region}/{size}/{rotation}/{quality}.jpg
        const id: string = this.getImageId(canvas);
        const region: string = 'full';
        const dimensions: Size = this.getConfinedImageDimensions(canvas, width);
        const size: string = dimensions.width + ',' + dimensions.height;
        const rotation: number = <number>this.getViewerRotation();
        const quality: string = 'default';
        return `${baseUri}/${id}/${region}/${size}/${rotation}/${quality}.jpg`;
    }

    getImageId(canvas: Manifesto.ICanvas): string {
        let id = this.getInfoUri(canvas);
        // First trim off info.json, then extract ID:
        id = id.substr(0, id.lastIndexOf("/"));
        return id.substr(id.lastIndexOf("/") + 1);
    }

    getImageBaseUri(canvas: Manifesto.ICanvas): string {
        let uri = this.getInfoUri(canvas);
        // First trim off info.json, then trim off ID....
        uri = uri.substr(0, uri.lastIndexOf("/"));
        return uri.substr(0, uri.lastIndexOf("/"));
    }

    getInfoUri(canvas: Manifesto.ICanvas): string{
        let infoUri: string | null = null;

        const images: Manifesto.IAnnotation[] = canvas.getImages();

        if (images && images.length) {
            let firstImage: Manifesto.IAnnotation = images[0];
            let resource: Manifesto.IResource = firstImage.getResource();
            let services: Manifesto.IService[] = resource.getServices();

            for (let i = 0; i < services.length; i++) {
                let service: Manifesto.IService = services[i];
                let id = service.id;

                if (!_.endsWith(id, '/')) {
                    id += '/';
                }

                if (manifesto.Utils.isImageProfile(service.getProfile())){
                    infoUri = id + 'info.json';
                }
            }
        }

        if (!infoUri){
            // todo: use compiler flag (when available)
            infoUri = 'lib/imageunavailable.json';
        }

        return infoUri;
    }

    getEmbedScript(template: string, width: number, height: number, zoom: string, rotation: number): string{
        const configUri = this.config.uri || '';
        let script = String.format(template, this.getSerializedLocales(), configUri, this.helper.iiifResourceUri, this.helper.collectionIndex, this.helper.manifestIndex, this.helper.sequenceIndex, this.helper.canvasIndex, zoom, rotation, width, height, this.embedScriptUri);
        return script;
    }

    getPrevPageIndex(canvasIndex: number = this.helper.canvasIndex): number {
        let index: number;

        if (this.isPagingSettingEnabled()){
            let indices: number[] = this.getPagedIndices(canvasIndex);

            if (this.helper.isRightToLeft()){
                index = indices[indices.length - 1] - 1;
            } else {
                index = indices[0] - 1;
            }

        } else {
            index = canvasIndex - 1;
        }

        return index;
    }

    isSearchWithinEnabled(): boolean {
        if (!Utils.Bools.getBool(this.config.options.searchWithinEnabled, false)){
            return false;
        }

        if (!this.helper.getSearchWithinService()) {
            return false;
        }

        return true;
    }

    isPagingSettingEnabled(): boolean {
        if (this.helper.isPagingAvailable()){
            return <boolean>this.getSettings().pagingEnabled;
        }

        return false;
    }

    getNextPageIndex(canvasIndex: number = this.helper.canvasIndex): number {
    
       let index: number;
    
       if (this.isPagingSettingEnabled()){
           let indices: number[] = this.getPagedIndices(canvasIndex);
    
           if (this.helper.isRightToLeft()){
               index = indices[0] + 1;
           } else {
               index = indices[indices.length - 1] + 1;
           }
    
       } else {
           index = canvasIndex + 1;
       }
    
       if (index > this.helper.getTotalCanvases() - 1) {
           return -1;
       }
    
       return index;
    }
    
    getAutoCompleteService(): Manifesto.IService | null {
       const service: Manifesto.IService = this.helper.getSearchWithinService();
       if (!service) return null;
       return service.getService(manifesto.ServiceProfile.autoComplete());
    }

    getAutoCompleteUri(): string | null {
        const service: Manifesto.IService | null = this.getAutoCompleteService();
        if (!service) return null;
        return service.id + '?q={0}';
    }

    getSearchWithinServiceUri(): string | null {
        const service: Manifesto.IService = this.helper.getSearchWithinService();

        if (!service) return null;

        let uri: string = service.id;
        uri = uri + "?q={0}";
        return uri;
    }

    searchWithin(terms: string): void {

        if (this.isSearching) return;

        this.isSearching = true;

        // clear search results
        this.searchResults = [];

        const that = this;

        let searchUri: string | null = this.getSearchWithinServiceUri();

        if (!searchUri) return;

        searchUri = String.format(searchUri, terms);

        this.getSearchResults(searchUri, terms, this.searchResults, (results: SearchResult[]) => {
            
            this.isSearching = false;

            if (results.length) {
                this.searchResults = results.sort((a, b) => {
                    return a.canvasIndex - b.canvasIndex;
                });
                
                $.publish(Commands.SEARCH_RESULTS, [{terms, results}]);

                // reload current index as it may contain results.
                that.viewPage(that.helper.canvasIndex, true);
            } else {
                that.showMessage(that.config.modules.genericDialogue.content.noMatches, () => {
                    $.publish(Commands.SEARCH_RESULTS_EMPTY);
                });
            }
        });
    }

    getSearchResults(searchUri: string, 
                    terms: string,
                    searchResults: SearchResult[],
                    cb: (results: SearchResult[]) => void): void {

        $.getJSON(searchUri, (results: any) => {
            
            if (results.resources && results.resources.length) {
                searchResults = searchResults.concat(this.parseSearchJson(results, searchResults));
            }

            if (results.next) {
                this.getSearchResults(results.next, terms, searchResults, cb);
            } else {
                cb(searchResults);
            }
        });
    }

    parseSearchJson(resultsToParse: any, searchResults: SearchResult[]): SearchResult[] {

        const parsedResults: SearchResult[] = [];

        for (let i = 0; i < resultsToParse.resources.length; i++) {
            const resource: any = resultsToParse.resources[i];
            const canvasIndex: number = this.helper.getCanvasIndexById(resource.on.match(/(.*)#/)[1]);
            const searchResult: SearchResult = new SearchResult(resource, canvasIndex);
            const match: SearchResult = parsedResults.en().where(x => x.canvasIndex === searchResult.canvasIndex).first();

            // if there's already a SearchResult for the canvas index, add a rect to it, otherwise create a new SearchResult
            if (match) {
                match.addRect(resource);
            } else {
                parsedResults.push(searchResult);
            }
        }

        // sort by canvasIndex
        parsedResults.sort((a, b) => {
            return a.canvasIndex - b.canvasIndex;
        });

        return parsedResults;
    }

    getSearchResultRects(): SearchResultRect[] {
        if (this.searchResults) {
            return this.searchResults.en().selectMany(x => x.rects).toArray();
        }
        return [];
    }

    getCurrentSearchResultRectIndex(): number {
        const searchResultRects: SearchResultRect[] = this.getSearchResultRects();
        return searchResultRects.indexOf(this.currentSearchResultRect);
    }

    getTotalSearchResultRects(): number {
        const searchResultRects: SearchResultRect[] = this.getSearchResultRects();
        return searchResultRects.length;
    }

    isFirstSearchResultRect(): boolean {
        return this.getCurrentSearchResultRectIndex() === 0;
    } 

    getLastSearchResultRectIndex(): number {
        return this.getTotalSearchResultRects() - 1;
    } 

    getPagedIndices(canvasIndex: number = this.helper.canvasIndex): number[] {

        let indices: number[] | undefined = [];

        // if it's a continuous manifest, get all resources.
        if (this.helper.isContinuous()) {
            indices = $.map(this.helper.getCanvases(), (c: Manifesto.ICanvas, index: number) => {
                return index;
            });
        } else {
            if (!this.isPagingSettingEnabled()) {
                indices.push(this.helper.canvasIndex);
            } else {
                if (this.helper.isFirstCanvas(canvasIndex) || (this.helper.isLastCanvas(canvasIndex) && this.helper.isTotalCanvasesEven())) {
                    indices = <number[]>[canvasIndex];
                } else if (canvasIndex % 2) {
                    indices = <number[]>[canvasIndex, canvasIndex + 1];
                } else {
                    indices = <number[]>[canvasIndex - 1, canvasIndex];
                }

                if (this.helper.isRightToLeft()) {
                    indices = indices.reverse();
                }
            }
        }

        return indices;
    }
}
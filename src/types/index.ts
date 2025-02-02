// Input data structure from Meta Content Library
export interface MetaContentLibraryRow {
    activities: number;
    content_type: string;
    creation_time: string;
    id: number;
    is_branded_content: boolean;
    lang: string;
    link_attachment: {
        caption: string;
        description: string;
        link: string;
        name: string;
    };
    match_type: number;
    mcl_url: string;
    modified_time: string;
    multimedia: string;
    post_owner: {
        type: string;
        id: number;
        name: string;
        username: string;
    };
    shared_post_id: number;
    statistics: {
        angry_count: number;
        care_count: number;
        comment_count: number;
        haha_count: number;
        like_count: number;
        love_count: number;
        reaction_count: number;
        sad_count: number;
        share_count: number;
        views: number;
        views_date_last_refreshed: number;
        wow_count: number;
    };
    surface: {
        type: string;
        id: number;
        name: string;
        username: string;
    };
    text: string;
}

// Output data structure for CSDS
export interface CSDSRow {
    account_id: number;      // from surface.id
    content_id: number;      // from id
    object_id: string;       // from text or link_attachment.link based on user choice
    timestamp_share: number; // UNIX timestamp from creation_time
}

// Component props and state interfaces
export interface TransformOptions {
    objectIdSource: 'text' | 'link';
}

export interface TransformationResult {
    success: boolean;
    data?: CSDSRow[];
    error?: string;
    rowCount?: number;
}

export interface FileUploadState {
    file: File | null;
    isLoading: boolean;
    error: string | null;
}

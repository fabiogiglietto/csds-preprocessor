export interface MetaContentLibraryRow {
    activities: number;
    content_type: string;
    creation_time: string;
    id: number;
    is_branded_content: boolean;
    lang: string;
    link_attachment: {
        caption: string | null;
        description: string | null;
        link: string | null;
        name: string | null;
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
        views_date_last_refreshed: string;
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

export interface TikTokResearchRow {
    video_id: number;
    author_name: string;
    view_count: number;
    comment_count: number;
    share_count: number;
    like_count: number;
    region_code: string;
    create_time: string;
    effect_ids: number | string;
    music_id: number | string;
    video_description: string;
    hashtag_names: string;
    voice_to_text: string;
    video_url: string;
}

export interface CSDSRow {
    account_id: string;
    content_id: number | string;
    object_id: string;
    timestamp_share: number;
}
